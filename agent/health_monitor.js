/**
 * Miner Health Monitor
 * 
 * Watches the miner process and auto-restarts on crash.
 * Logs all events and optionally sends telemetry to backend.
 * 
 * Usage: node health_monitor.js
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
    restartDelay: 3000, // 3 seconds between restarts
    maxRestarts: 5, // Max restarts before giving up
    restartWindow: 300000, // 5 minute window for max restarts
    telemetryEndpoint: process.env.VITE_API_URL ? `${process.env.VITE_API_URL}/miner/health` : null,
};

// State
let minerProcess = null;
let restartCount = 0;
let restartTimestamps = [];
let isShuttingDown = false;

// Logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}`;
    console.log(line);
    fs.appendFileSync(CONFIG.logFile, line + '\n');
}

// Alert backend about health events (optional)
async function sendHealthAlert(event, details) {
    if (!CONFIG.telemetryEndpoint) return;
    
    try {
        await fetch(CONFIG.telemetryEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event,
                details,
                timestamp: Date.now(),
                workerName: process.env.WORKER_NAME || 'unknown'
            })
        }).catch(() => {}); // Fire and forget
    } catch (e) {
        // Silent fail - don't crash monitor on telemetry issues
    }
}

// Check if we're in a restart loop
function checkRestartLoop() {
    const now = Date.now();
    // Remove old timestamps outside the window
    restartTimestamps = restartTimestamps.filter(ts => now - ts < CONFIG.restartWindow);
    
    if (restartTimestamps.length >= CONFIG.maxRestarts) {
        return true;
    }
    return false;
}

// Start the miner process
function startMiner() {
    if (isShuttingDown) return;
    
    if (!fs.existsSync(CONFIG.minerBin)) {
        log(`Miner binary not found: ${CONFIG.minerBin}`, 'ERROR');
        return;
    }

    log(`Starting miner: ${CONFIG.minerBin}`);
    
    minerProcess = spawn(CONFIG.minerBin, {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
    });

    minerProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        // Log hashrate updates
        if (output.includes('accepted') || output.includes('hashrate')) {
            log(`Miner: ${output.trim()}`, 'MINER');
        }
    });

    minerProcess.stderr?.on('data', (data) => {
        log(`Miner Error: ${data.toString().trim()}`, 'ERROR');
    });

    minerProcess.on('error', (err) => {
        log(`Miner process error: ${err.message}`, 'ERROR');
        sendHealthAlert('process_error', { error: err.message });
    });

    minerProcess.on('exit', (code, signal) => {
        minerProcess = null;
        
        if (isShuttingDown) {
            log('Miner stopped (shutdown)', 'INFO');
            return;
        }

        log(`Miner exited (code: ${code}, signal: ${signal})`, 'WARN');
        sendHealthAlert('crash', { code, signal });

        // Check for restart loop
        if (checkRestartLoop()) {
            log(`CRITICAL: Restart loop detected (${CONFIG.maxRestarts} restarts in ${CONFIG.restartWindow/1000}s). Not restarting.`, 'ERROR');
            sendHealthAlert('restart_loop', { 
                restarts: restartTimestamps.length, 
                window: CONFIG.restartWindow 
            });
            return;
        }

        // Schedule restart
        restartTimestamps.push(Date.now());
        log(`Restarting miner in ${CONFIG.restartDelay/1000}s...`, 'INFO');
        
        setTimeout(() => {
            if (!isShuttingDown) {
                startMiner();
            }
        }, CONFIG.restartDelay);
    });

    log('Miner started', 'SUCCESS');
}

// Graceful shutdown
function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    log('Shutting down health monitor...', 'INFO');
    
    if (minerProcess) {
        log('Stopping miner process...', 'INFO');
        minerProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
            if (minerProcess) {
                minerProcess.kill('SIGKILL');
            }
        }, 5000);
    }
    
    process.exit(0);
}

// Signal handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', () => {
    log('Received SIGHUP - restarting miner', 'INFO');
    if (minerProcess) {
        minerProcess.kill('SIGTERM');
    }
});

// Start monitoring
log('=== Health Monitor Started ===');
log(`Platform: ${process.platform} ${process.arch}`);
log(`Miner: ${CONFIG.minerBin}`);
startMiner();
