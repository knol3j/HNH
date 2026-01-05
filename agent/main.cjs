const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const setupMiner = require('./setup.cjs');

// Keep global reference of server process
let agentServerProcess = null;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#0d0d0d',
        icon: path.join(__dirname, 'icon.png'), // If we had one
        webPreferences: {
            nodeIntegration: false, // Security
            contextIsolation: true,
            webSecurity: false // ALLOW MIXED CONTENT (HTTPS -> HTTP Localhost)
        },
        autoHideMenuBar: true
    });

    // Handle Mixed Content Warnings
    win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
    });

    // Allow running insecure content (essential for https://hashnhedge.com -> http://localhost:4343)
    // Note: In newer Electron versions, webSecurity: false covers most, but specific cert errors might need handling

    // Load the MAIN WEB APP
    // Development: localhost:3000
    // Production: https://hashnhedge.com
    const WEB_APP_URL = 'http://localhost:3000';
    // const WEB_APP_URL = 'https://hashnhedge.com';

    console.log(`[ELECTRON] Loading ${WEB_APP_URL}...`);
    win.loadURL(WEB_APP_URL);

    // Inject a small script to ensure the web app knows it's running in Electron (optional)
    // win.webContents.executeJavaScript('window.IS_ELECTRON = true;');

    win.webContents.on('did-fail-load', () => {
        console.log('[ELECTRON] Failed to load page, retrying in 3s...');
        setTimeout(() => win.loadURL(WEB_APP_URL), 3000);
    });
}

function startAgentServer() {
    console.log('[ELECTRON] Starting Agent Server...');
    const serverScript = path.join(__dirname, 'server.js');

    // Spawn 'node server.js'
    agentServerProcess = spawn('node', [serverScript], {
        stdio: 'inherit', // Pipe output to main console
        cwd: __dirname
    });

    agentServerProcess.on('close', (code) => {
        console.log(`[ELECTRON] Agent Server exited with code ${code}`);
    });

    agentServerProcess.on('error', (err) => {
        console.error('[ELECTRON] Failed to start Agent Server:', err);
    });
}

app.whenReady().then(async () => {
    // 1. Run Setup (Auto-Install XMRig)
    console.log('[ELECTRON] Checking dependencies...');
    await setupMiner();

    // 2. Start Agent API
    startAgentServer();

    // 3. Open UI
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    // Kill the child server process when Electron quits
    if (agentServerProcess) {
        agentServerProcess.kill();
    }
});
