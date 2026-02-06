const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep global reference of server process
let agentServerProcess = null;

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        backgroundColor: '#0d0d0d',
        icon: path.join(__dirname, 'icon.png'), // If we had one
        webPreferences: {
            nodeIntegration: false, // Security
            contextIsolation: true
        },
        autoHideMenuBar: true
    });

    // Load the local server
    // We wait a second for the server to start
    setTimeout(() => {
        win.loadURL('http://localhost:4343');
    }, 2000);

    // Simple retry if failed to connect immediately
    win.webContents.on('did-fail-load', () => {
        setTimeout(() => win.loadURL('http://localhost:4343'), 1000);
    });
}

function startAgentServer() {
    console.log('Starting Agent Server...');
    const serverScript = path.join(__dirname, 'server.js');

    // Spawn 'node server.js'
    agentServerProcess = spawn('node', [serverScript], {
        stdio: 'inherit', // Pipe output to main console
        cwd: __dirname
    });

    agentServerProcess.on('close', (code) => {
        console.log(`Agent Server exited with code ${code}`);
    });

    agentServerProcess.on('error', (err) => {
        console.error('Failed to start Agent Server:', err);
    });
}

app.whenReady().then(() => {
    startAgentServer();
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
