const WebSocket = require('ws');
const net = require('net');
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

/**
 * OrchestratorAwareAgent
 * Stratum-based miner/agent that reports capabilities and handles
 * both mining (sha256d) and AI/ML job assignments from the orchestrator.
 *
 * Protocol: Stratum JSON-RPC over WebSocket or TCP.
 * Custom notifications:
 *   - mining.notify  -> mining job
 *   - ai.job         -> AI/ML job
 *   - agent.config   -> runtime config from orchestrator
 */
class OrchestratorAwareAgent {
  constructor(config = {}) {
    this.config = {
      poolUrl: config.poolUrl || process.env.POOL_WS_URL || 'ws://localhost:3333',
      walletAddress: config.walletAddress || process.env.WALLET_ADDRESS || '',
      workerName: config.workerName || process.env.WORKER_NAME || `agent-${os.hostname()}`,
      useWs: config.useWs !== undefined ? config.useWs : true,
      reconnectInterval: config.reconnectInterval || 5000,
      ...config
    };

    this.capabilities = this.detectCapabilities();
    this.connection = null;
    this.authorized = false;
    this.subscribed = false;
    this.currentJob = null;
    this.currentJobType = null;
    this.miningActive = false;
    this.hashCounter = 0;
    this.lastHashrate = 0;
    this.stats = {
      sharesSubmitted: 0,
      sharesAccepted: 0,
      sharesRejected: 0,
      aiJobsCompleted: 0,
      startTime: Date.now()
    };
    this.msgId = 1;
    this.pending = new Map();
    this.reconnectTimer = null;
    this.hashrateTimer = null;
    this.heartbeatTimer = null;
  }

  /* ── Capability Detection ─────────────────────────────────────────── */

  detectCapabilities() {
    const caps = {
      mining: true,
      ai: false,
      hashcat: false,
      rendering: false,
      cpuCores: os.cpus().length,
      os: process.platform
    };

    // Try NVIDIA
    try {
      const out = execSync('nvidia-smi -L', { encoding: 'utf8', timeout: 5000 });
      const count = (out.match(/GPU \d+:/g) || []).length;
      if (count > 0) {
        caps.gpuVendor = 'NVIDIA';
        caps.gpuCount = count;
        caps.mining = true;
        caps.ai = true;
        caps.rendering = true;
        caps.cuda = true;
      }
    } catch (_) {
      // no nvidia-smi
    }

    // Try AMD
    if (!caps.gpuVendor) {
      try {
        const out = execSync('rocm-smi -l', { encoding: 'utf8', timeout: 5000 });
        const count = (out.match(/GPU\[\d+\]/g) || []).length;
        if (count > 0) {
          caps.gpuVendor = 'AMD';
          caps.gpuCount = count;
          caps.mining = true;
          caps.rocm = true;
        }
      } catch (_) {
        // no rocm-smi
      }
    }

    // Fallback CPU-only
    if (!caps.gpuVendor) {
      caps.gpuVendor = 'CPU';
      caps.gpuCount = 0;
      caps.mining = true;
    }

    return caps;
  }

  /* ── Connection ───────────────────────────────────────────────────── */

  connect() {
    if (this.config.useWs && this.config.poolUrl.startsWith('ws')) {
      this.connectWebSocket();
    } else {
      this.connectTCP();
    }
  }

  connectWebSocket() {
    console.log(`[Agent] Connecting via WebSocket to ${this.config.poolUrl}`);
    const ws = new WebSocket(this.config.poolUrl);
    this.connection = ws;

    ws.on('open', () => {
      console.log('[Agent] WebSocket connected');
      this.onConnect();
    });

    ws.on('message', (data) => {
      this.onData(data.toString());
    });

    ws.on('close', () => this.onDisconnect());
    ws.on('error', (err) => this.onError(err));
  }

  connectTCP() {
    const [host, portStr] = this.config.poolUrl.replace('stratum+tcp://', '').split(':');
    const port = parseInt(portStr, 10) || 3333;
    console.log(`[Agent] Connecting via TCP to ${host}:${port}`);

    const socket = new net.Socket();
    this.connection = socket;
    socket.setEncoding('utf8');

    socket.connect(port, host, () => {
      console.log('[Agent] TCP connected');
      this.onConnect();
    });

    let buffer = '';
    socket.on('data', (data) => {
      buffer += data;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.trim()) this.onData(line.trim());
      }
    });

    socket.on('close', () => this.onDisconnect());
    socket.on('error', (err) => this.onError(err));
  }

  /* ── Protocol Handlers ────────────────────────────────────────────── */

  onConnect() {
    this.performHandshake().catch(err => {
      console.error('[Agent] Handshake failed:', err.message);
    });
  }

  async performHandshake() {
    // Subscribe
    const subRes = await this.send('mining.subscribe', [
      'hashnhedge-agent/2.0.0',
      null
    ]);

    if (subRes.error) {
      console.error('[Agent] Subscribe failed:', subRes.error);
      return;
    }

    this.subscribed = true;
    console.log('[Agent] Subscribed');

    // Authorize with capabilities encoded in password
    const capabilitiesJson = JSON.stringify(this.capabilities);
    const authRes = await this.send('mining.authorize', [
      `${this.config.walletAddress}.${this.config.workerName}`,
      capabilitiesJson
    ]);

    if (authRes.error || authRes.result !== true) {
      console.error('[Agent] Authorization failed:', authRes.error || authRes.result);
      return;
    }

    this.authorized = true;
    console.log('[Agent] Authorized');
    this.startHeartbeat();
    this.startHashrateReporter();
  }

  onData(raw) {
    try {
      const msg = JSON.parse(raw);

      if (msg.id !== null && msg.id !== undefined && this.pending.has(msg.id)) {
        const cb = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        cb(msg);
        return;
      }

      if (msg.method) {
        this.handleNotification(msg);
      }
    } catch (err) {
      console.error('[Agent] JSON parse error:', err.message, raw.slice(0, 200));
    }
  }

  onDisconnect() {
    console.log('[Agent] Disconnected. Reconnecting...');
    this.stopAllJobs();
    this.authorized = false;
    this.subscribed = false;
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, this.config.reconnectInterval);
    }
  }

  onError(err) {
    console.error('[Agent] Connection error:', err.message);
  }

  send(method, params) {
    const id = this.msgId++;
    const payload = JSON.stringify({ id, method, params }) + '\n';

    return new Promise((resolve) => {
      this.pending.set(id, resolve);

      if (this.connection instanceof WebSocket) {
        if (this.connection.readyState === WebSocket.OPEN) {
          this.connection.send(payload);
        }
      } else if (this.connection && this.connection.writable) {
        this.connection.write(payload);
      }

      // Timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          resolve({ id, error: 'timeout' });
        }
      }, 10000);
    });
  }

  handleNotification(msg) {
    switch (msg.method) {
      case 'mining.notify':
        this.onMiningJob(msg.params);
        break;
      case 'ai.job':
        this.onAIJob(msg.params);
        break;
      case 'agent.config':
        this.onAgentConfig(msg.params);
        break;
      case 'mining.set_difficulty':
        this.onSetDifficulty(msg.params);
        break;
      default:
        console.log('[Agent] Unknown notification:', msg.method);
    }
  }

  /* ── Job Handlers ─────────────────────────────────────────────────── */

  onMiningJob(params) {
    const [
      jobId, prevhash, coinb1, coinb2, merkleBranch,
      version, nbits, ntime, cleanJobs
    ] = params;

    if (cleanJobs) {
      this.stopAllJobs();
    }

    this.currentJob = {
      jobId,
      prevhash,
      coinb1,
      coinb2,
      merkleBranch,
      version,
      nbits,
      ntime,
      type: 'mining'
    };
    this.currentJobType = 'mining';

    console.log(`[Agent] Mining job ${jobId} received`);
    this.startMining();
  }

  onAIJob(params) {
    const [job] = params;
    this.stopAllJobs();

    this.currentJob = {
      jobId: job.job_id,
      task: job.task_type,
      model: job.model,
      data: job.task_data,
      endpoint: job.endpoint,
      timeout: job.timeout || 300,
      type: 'ai'
    };
    this.currentJobType = 'ai';

    console.log(`[Agent] AI job ${job.job_id} received (${job.task_type})`);
    this.startAIJob();
  }

  onAgentConfig(params) {
    const [config] = params;
    console.log('[Agent] Config update:', config);
    if (config.reconnectInterval) {
      this.config.reconnectInterval = config.reconnectInterval;
    }
  }

  onSetDifficulty(params) {
    const [diff] = params;
    console.log('[Agent] Difficulty set to', diff);
  }

  /* ── Job Execution ────────────────────────────────────────────────── */

  startMining() {
    if (this.miningActive) return;
    this.miningActive = true;
    this.hashCounter = 0;
    console.log('[Agent] Mining started');

    const loop = () => {
      if (!this.miningActive || !this.currentJob || this.currentJobType !== 'mining') return;

      const nonce = Math.floor(Math.random() * 0xFFFFFFFF);
      const data = this.currentJob.prevhash + nonce.toString(16).padStart(8, '0');
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      this.hashCounter++;

      if (hash.startsWith('0000')) {
        this.submitShare(nonce, hash);
      }

      setImmediate(loop);
    };

    loop();
  }

  async startAIJob() {
    const job = this.currentJob;
    console.log(`[Agent] Starting AI job ${job.jobId}: ${job.task}`);

    try {
      // Simulate AI work (in production, this would call actual ML frameworks)
      const duration = Math.min(job.timeout, 60) * 1000;
      await this.sleep(duration);

      const result = {
        jobId: job.jobId,
        status: 'completed',
        output: `Simulated ${job.task} result`,
        metrics: { duration }
      };

      this.stats.aiJobsCompleted++;
      console.log(`[Agent] AI job ${job.jobId} completed`);
      this.reportJobCompletion(result);
    } catch (err) {
      console.error(`[Agent] AI job ${job.jobId} failed:`, err.message);
      this.reportJobCompletion({
        jobId: job.jobId,
        status: 'failed',
        error: err.message
      });
    }
  }

  stopAllJobs() {
    this.miningActive = false;
    this.currentJob = null;
    this.currentJobType = null;
  }

  async submitShare(nonce, hash) {
    if (!this.authorized || !this.currentJob) return;

    this.stats.sharesSubmitted++;
    const extraNonce2 = '00000000';
    const ntime = Math.floor(Date.now() / 1000).toString(16);

    const res = await this.send('mining.submit', [
      this.config.workerName,
      this.currentJob.jobId,
      extraNonce2,
      ntime,
      nonce.toString(16)
    ]);

    if (res.result === true) {
      this.stats.sharesAccepted++;
      console.log(`[Agent] Share accepted (${hash.slice(0, 16)}...)`);
    } else {
      this.stats.sharesRejected++;
      console.log('[Agent] Share rejected:', res.error);
    }
  }

  reportJobCompletion(result) {
    // Some pools support agent.job_result
    this.send('agent.job_result', [result]).catch(() => {});
  }

  /* ── Heartbeat & Stats ────────────────────────────────────────────── */

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send('agent.heartbeat', [{
        hashrate: this.lastHashrate,
        uptime: Date.now() - this.stats.startTime,
        stats: this.stats
      }]).catch(() => {});
    }, 30000);
  }

  startHashrateReporter() {
    this.hashrateTimer = setInterval(() => {
      const elapsed = 10;
      this.lastHashrate = Math.floor(this.hashCounter / elapsed);
      this.hashCounter = 0;
    }, 10000);
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /* ── Lifecycle ────────────────────────────────────────────────────── */

  disconnect() {
    this.stopAllJobs();
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.hashrateTimer) clearInterval(this.hashrateTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.connection) {
      try { this.connection.close(); } catch (_) {}
    }
  }
}

/* ── CLI Entry Point ────────────────────────────────────────────────── */

if (require.main === module) {
  const agent = new OrchestratorAwareAgent({
    poolUrl: process.env.POOL_WS_URL || 'ws://localhost:3333',
    walletAddress: process.env.WALLET_ADDRESS || 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc',
    workerName: process.env.WORKER_NAME || `agent-${os.hostname()}`
  });

  console.log('[Agent] OrchestratorAwareAgent starting...');
  console.log('[Agent] Capabilities:', agent.capabilities);

  agent.connect();

  process.on('SIGINT', () => {
    console.log('\n[Agent] Shutting down...');
    agent.disconnect();
    process.exit(0);
  });
}

module.exports = OrchestratorAwareAgent;
