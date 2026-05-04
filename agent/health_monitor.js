/**
 * Miner Health Monitor
 * 
 * Monitored miner process with auto-restart capability.
 * Inspired by MinerGate's approach: simple, reliable, self-healing.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    minerBin: path.join(__dirname, 'bin', process.platform === 'win32' ? 'xmrig.exe' : 'xmrig'),
    logFile: path.join(__dirname, 'health_monitor.log'),
    restartDelay: 5000,
    maxRestarts: 5,
    restartWindow: 300000,
    heartbeatTimeout: 60000
};

// State
let minerProcess = null;
let restartCount = 0;
let restartTimestamps = [];
let isShuttingDown = false;
let heartbeatTimer = null;

// Logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}`;
    console.log(line);
    try {
        fs.appendFileSync(CONFIG.logFile, line + '\n');
    } catch (e) {}
}

// Heartbeat - check if miner is responsive
function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    
    heartbeatTimer = setInterval(() => {
        if (minerProcess && Date.now() - (minerProcess._lastOutput || 0) > CONFIG.heartbeatTimeout) {
            log('Heartbeat timeout - miner may be stuck', 'WARN');
            restartMiner();
        }
    }, CONFIG.heartbeatTimeout);
}

// Check restart loop
function checkRestartLoop() {
    const now = Date.now();
    restartTimestamps = restartTimestamps.filter(ts => now - ts < CONFIG.restartWindow);
    
    return restartTimestamps.length >= CONFIG.maxRestarts;
}

// Start the miner
function startMiner() {
    if (isShuttingDown) return;
    
    // Check for restart loop
    if (checkRestartLoop()) {
        log(`CRITICAL: Restart loop detected (${CONFIG.maxRestarts} restarts in ${CONFIG.restartWindow/1000}s)`, 'ERROR');
        return;
    }
    
    if (!fs.existsSync(CONFIG.minerBin)) {
        log(`Miner binary not found: ${CONFIG.minerBin}`, 'ERROR');
        return;
    }
    
    log('Starting miner...');
    minerProcess = null;
    
    try {
        const args = [
            '-c', path.join(__dirname, 'bin/config.json'),
            '--no-color',
            '--http-host', '127.0.0.1',
            '--http-port', '4444'
        ];
        
        minerProcess = spawn(CONFIG.minerBin, args, {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env }
        });
        
        minerProcess._lastOutput = Date.now();
        
        minerProcess.stdout?.on('data', (data) => {
            minerProcess._lastOutput = Date.now();
            const output = data.toString();
            if (output.includes('accepted') || output.includes('hashrate')) {
                log(`Miner: ${output.trim().substring(0, 200)}`, 'MINER');
            }
        });
        
        minerProcess.stderr?.on('data', (data) => {
            log(`Miner Error: ${data.toString().trim()}`, 'ERROR');
        });
        
        minerProcess.on('error', (err) => {
            log(`Miner process error: ${err.message}`, 'ERROR');
        });
        
        minerProcess.on('close', (code, signal) => {
            minerProcess = null;
            
            if (isShuttingDown) {
                log('Miner stopped (shutdown)', 'INFO');
                return;
            }
            
            log(`Miner exited (code: ${code}, signal: ${signal})`, code === 0 ? 'INFO' : 'WARN');
            
            restartTimestamps.push(Date.now());
            restartMiner();
        });
        
        startHeartbeat();
        log('Miner started', 'SUCCESS');
    } catch (e) {
        log(`Failed to start miner: ${e.message}`, 'ERROR');
        setTimeout(startMiner, CONFIG.restartDelay);
    }
}

// Restart miner with delay
function restartMiner() {
    if (isShuttingDown) return;
    
    if (minerProcess) {
        try {
            minerProcess.kill('SIGTERM');
        } catch (e) {}
        minerProcess = null;
    }
    
    log(`Restarting miner in ${CONFIG.restartDelay/1000}s...`, 'INFO');
    setTimeout(startMiner, CONFIG.restartDelay);
}

// Graceful shutdown
function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    log('Shutting down health monitor...', 'INFO');
    
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    
    if (minerProcess) {
        try {
            minerProcess.kill('SIGTERM');
            setTimeout(() => {
                if (minerProcess) minerProcess.kill('SIGKILL');
            }, 5000);
        } catch (e) {}
    }
    
    process.exit(0);
}

// Signal handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', () => {
    log('Received SIGHUP - restarting miner', 'INFO');
    restartMiner();
});

// Start monitoring
log('=== Health Monitor Started ===');
log(`Platform: ${process.platform} ${process.arch}`);
log(`Miner: ${CONFIG.minerBin}`);
startMiner();

// Export for testing
export { startMiner, shutdown };