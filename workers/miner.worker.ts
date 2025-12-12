
// miner.worker.ts
// Client-side CPU Miner

let isMining = false;
let sharesFound = 0;
let hashes = 0;
const START_TIME = Date.now();

// Simulation difficulty
const DIFFICULTY = 0.99995; // Very high probability of NOT finding a share (since hashing is fast)
// Actually, let's make it produce a share every ~10s for UX
const SHARE_CHANCE = 0.005; // Per Tick (not per hash)

interface MiningStats {
    hashrate: number;
    shares: number;
    difficulty: number;
}

self.onmessage = (e: MessageEvent) => {
    const { command, data } = e.data;

    switch (command) {
        case 'START':
            isMining = true;
            loop();
            postMessage({ type: 'log', data: '🚀 Browser Miner Started (CPU Mode)' });
            break;
        case 'STOP':
            isMining = false;
            postMessage({ type: 'log', data: '🛑 Browser Miner Stopped' });
            break;
    }
};

const loop = () => {
    if (!isMining) return;

    // Burn some CPU
    const batchSize = 50000;
    for (let i = 0; i < batchSize; i++) {
        // "Hashing"
        Math.random();
        hashes++;
    }

    // Check for share (Probabilistic)
    if (Math.random() < SHARE_CHANCE) {
        sharesFound++;
        const shareId = Math.floor(Math.random() * 0xFFFFFF).toString(16);
        postMessage({ type: 'share', data: shareId });
        postMessage({ type: 'log', data: `⛏️ Found Share #${shareId} (Browser)` });
    }

    // Report Telemetry
    const elapsed = (Date.now() - START_TIME) / 1000;
    const hashrate = hashes / elapsed; // H/s

    postMessage({
        type: 'stats',
        data: {
            hashrate: hashrate,
            shares: sharesFound,
            difficulty: 1
        }
    });

    // Loop
    setTimeout(loop, 100);
};
