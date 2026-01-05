const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

// Configuration
const XMRIG_VERSION = "6.22.2";
const XMRIG_URL = `https://github.com/xmrig/xmrig/releases/download/v${XMRIG_VERSION}/xmrig-${XMRIG_VERSION}-gcc-win64.zip`;
const DEST_DIR = path.join(__dirname, 'bin');
const ZIP_FILE = path.join(__dirname, 'xmrig.zip');
const XMRIG_EXE = path.join(DEST_DIR, 'xmrig.exe');

// Helper: Download File
const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
};

// Main Setup Logic
async function setup() {
    console.log('[SETUP] Checking miner dependencies...');

    if (fs.existsSync(XMRIG_EXE)) {
        console.log('[SETUP] XMRig already installed.');
        return true;
    }

    console.log(`[SETUP] Downloading XMRig v${XMRIG_VERSION}...`);
    try {
        if (!fs.existsSync(DEST_DIR)) {
            fs.mkdirSync(DEST_DIR, { recursive: true });
        }

        await downloadFile(XMRIG_URL, ZIP_FILE);
        console.log('[SETUP] Download complete. Extracting...');

        const zip = new AdmZip(ZIP_FILE);
        zip.extractAllTo(DEST_DIR, true);

        // Move text files to root of bin if nested
        // The zip usually contains a folder xmrig-6.22.2-gcc-win64
        // We need to flatten it or ensure we point to the right exe

        // Find where the exe ended up
        // Simple heuristic: look for exe in subfolders
        const findExe = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    const found = findExe(fullPath);
                    if (found) return found;
                } else if (file === 'xmrig.exe') {
                    return fullPath;
                }
            }
            return null;
        };

        const foundExe = findExe(DEST_DIR);
        if (foundExe && foundExe !== XMRIG_EXE) {
            console.log(`[SETUP] Moving binary from ${foundExe} to ${XMRIG_EXE}`);
            fs.copyFileSync(foundExe, XMRIG_EXE);
            // Optionally clean up the extracted folder, but keeping it is fine for configs
        }

        // Cleanup Zip
        fs.unlinkSync(ZIP_FILE);

        console.log('[SETUP] Installation complete!');
        return true;

    } catch (e) {
        console.error('[SETUP] Error installing miner:', e);
        return false;
    }
}

// Export for usage or run directly
if (require.main === module) {
    setup();
} else {
    module.exports = setup;
}
