
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4343;

// --- STATE ---
let walletAddress = '';
let verifiedShares = 0;
let isMining = true;

// Job State
let currentJob = null; // null | { id, title, progress, status }
const JOB_TYPES = [
    { type: 'AI', title: 'Llama-3-70b-Instruct Inference', duration: 15000 },
    { type: 'AI', title: 'Stable Diffusion XL Batch Render', duration: 10000 },
    { type: 'AI', title: 'Whisper Audio Transcription', duration: 8000 }
];

// --- SIMULATION LOOPS ---

// 1. Mining Loop (Produces Verified Shares)
setInterval(() => {
    if (isMining && !currentJob) {
        // Probability of finding a share depends on "hashrate" (simulated)
        if (Math.random() > 0.3) {
            verifiedShares++;
        }
    }
}, 1000);

// 2. Job Coordinator Loop (Simulates receiving jobs)
setInterval(() => {
    // 20% chance to get a new job if idle
    if (!currentJob && Math.random() > 0.8) {
        isMining = false; // Stop mining to do job
        const jobTemplate = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];

        currentJob = {
            id: `job-${Date.now()}`,
            title: jobTemplate.title,
            progress: 0,
            status: 'RUNNING',
            startTime: Date.now(),
            totalDuration: jobTemplate.duration
        };
        console.log(`[AGENT] Received Job: ${currentJob.title}`);
    }
}, 5000);

// 3. Job Execution Loop
setInterval(() => {
    if (currentJob && currentJob.status === 'RUNNING') {
        const elapsed = Date.now() - currentJob.startTime;
        currentJob.progress = Math.min(100, (elapsed / currentJob.totalDuration) * 100);

        if (currentJob.progress >= 100) {
            currentJob.status = 'COMPLETED';
            console.log(`[AGENT] Job Component: ${currentJob.title}`);

            // Cooldown before returning to mining
            setTimeout(() => {
                currentJob = null;
                isMining = true;
                console.log(`[AGENT] Returning to Mining...`);
            }, 2000);
        }
    }
}, 500);


// --- API ENDPOINTS ---

app.get('/telemetry', (req, res) => {
    // Simulate slight fluctuation in hardware stats
    const gpuTemp = 65 + Math.random() * 5;
    const powerDraw = isMining ? 220 + Math.random() * 10 : 250; // AI jobs use more power usually, or less depending on load. Let's say similar.

    // Hashrate drops to 0 if doing an AI job
    const hashrate = isMining ? 30 + Math.random() * 2 : 0;

    res.json({
        gpu_temp: gpuTemp,
        gpu_util: currentJob ? 100 : 99, // 100% for AI, 99% for mining
        fan_speed: 70 + Math.random() * 5,
        power_draw: powerDraw,
        vram_used: currentJob ? 12000 : 4096, // More VRAM for AI
        hashrate: hashrate,

        // Agent Specifics
        verified_shares: verifiedShares,
        active_job: currentJob,
        wallet: walletAddress,
        status: currentJob ? 'COMPUTE' : 'MINING'
    });
});

app.get('/stats', (req, res) => {
    // Return "Real" stats based on this single node's perspective
    res.json({
        activeNodes: 1, // Just us
        totalTflops: currentJob ? 1.9 : 0.08, // H100 vs Consumer
        jobsRunning: currentJob ? 1 : 0,
        networkUtilization: currentJob ? 100 : 0,
        avgPricePerFLOP: 0.002
    });
});

app.get('/jobs', (req, res) => {
    // Return active jobs list
    const jobs = currentJob ? [currentJob] : [];
    res.json(jobs);
});

app.post('/config', (req, res) => {
    const { wallet, paused } = req.body;
    if (wallet) {
        walletAddress = wallet;
        console.log(`[AGENT] Wallet updated: ${wallet}`);
    }
    // TODO: Handle paused state
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Compute Agent running on http://localhost:${PORT}`);
    console.log("Connect via Provider Dashboard...");
});
