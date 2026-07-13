/**
 * HashNHedge Lightweight Stratum Server
 * Minimal Stratum protocol implementation for hybrid compute/mining
 */

const net = require('net');
const crypto = require('crypto');
const EventEmitter = require('events');
const ShareValidator = require('./share-validator');
const JobGenerator = require('./job-generator');

class StratumServer extends EventEmitter {
  constructor(orchestrator, config = {}) {
    super();

    this.orchestrator = orchestrator;
    this.config = {
      port: config.port || 3333,
      host: config.host || '0.0.0.0',
      connectionTimeout: config.connectionTimeout || 600000, // 10 min
      ...config
    };

    this.clients = new Map(); // socket -> client data
    this.server = null;
    this.validator = new ShareValidator();
    this.jobGenerator = new JobGenerator(config.jobGenerator);
  }

  /**
   * Start Stratum server
   */
  start() {
    this.server = net.createServer(socket => this.handleConnection(socket));

    this.server.listen(this.config.port, this.config.host, () => {
      console.log(`⚡ Stratum server listening on ${this.config.host}:${this.config.port}`);
      this.emit('server:started', { host: this.config.host, port: this.config.port });
    });

    this.server.on('error', err => {
      console.error('❌ Stratum server error:', err);
      this.emit('server:error', err);
    });

    // Listen for job assignments from orchestrator
    this.orchestrator.on('worker:job', ({ workerId, job, jobType }) => {
      this.sendJobToClient(workerId, job, jobType);
    });
  }

  /**
   * Handle new miner connection
   */
  handleConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;

    console.log(`🔗 New connection: ${clientId}`);

    const client = {
      id: clientId,
      socket: socket,
      authorized: false,
      subscribed: false,
      worker: null,
      buffer: '',
      lastActivity: Date.now()
    };

    this.clients.set(socket, client);

    // Set up socket handlers
    socket.setEncoding('utf8');
    socket.setKeepAlive(true);
    socket.setTimeout(this.config.connectionTimeout);

    socket.on('data', data => this.handleData(client, data));
    socket.on('error', err => this.handleError(client, err));
    socket.on('close', () => this.handleDisconnect(client));
    socket.on('timeout', () => {
      console.log(`⏱️  Client timeout: ${clientId}`);
      socket.end();
    });

    this.emit('client:connected', clientId);
  }

  /**
   * Handle incoming data from client
   */
  handleData(client, data) {
    client.buffer += data;
    client.lastActivity = Date.now();

    // Process line by line (Stratum is line-based JSON-RPC)
    const lines = client.buffer.split('\n');
    client.buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        this.processMessage(client, line.trim());
      }
    }
  }

  /**
   * Process Stratum JSON-RPC message
   */
  processMessage(client, message) {
    try {
      const msg = JSON.parse(message);
      console.log(`📨 Received from ${client.id}:`, msg.method || 'response');

      if (msg.method) {
        // Request from client
        this.handleRequest(client, msg);
      } else if (msg.result !== undefined || msg.error !== undefined) {
        // Response from client
        this.handleResponse(client, msg);
      }
    } catch (err) {
      console.error(`❌ Invalid JSON from ${client.id}:`, message);
      console.error(`❌ Parse error:`, err.message);

      // Try to send error, but don't crash if it fails
      try {
        this.sendError(client, null, -32700, 'Parse error');
      } catch (sendErr) {
        console.error(`[Stratum] Failed to send error response:`, sendErr.message);
      }
    }
  }

  /**
   * Handle Stratum method requests
   */
  handleRequest(client, msg) {
    const { id, method, params } = msg;

    switch (method) {
      // Standard Stratum protocol
      case 'mining.subscribe':
        this.handleSubscribe(client, id, params);
        break;

      case 'mining.authorize':
        this.handleAuthorize(client, id, params);
        break;

      case 'mining.submit':
        this.handleSubmit(client, id, params);
        break;

      case 'mining.extranonce.subscribe':
        // Optional: VarDiff support
        this.sendResponse(client, id, true);
        break;

      // ethProxy protocol (for T-Rex and other miners)
      case 'eth_submitLogin':
        this.handleEthSubmitLogin(client, id, params);
        break;

      case 'eth_getWork':
        this.handleEthGetWork(client, id, params);
        break;

      case 'eth_submitWork':
      case 'eth_submitHashrate':
        this.handleEthSubmitWork(client, id, params);
        break;

      case 'ai.submit':
        this.handleAISubmit(client, id, params);
        break;

      case 'agent.heartbeat':
        this.handleAgentHeartbeat(client, id, params);
        break;

      case 'agent.job_result':
        this.handleAgentJobResult(client, id, params);
        break;

      default:
        this.sendError(client, id, -3, `Method not found: ${method}`);
    }
  }

  /**
   * Parse capabilities JSON from the mining.authorize password field.
   */
  _parseCapabilities(password) {
    if (!password || typeof password !== 'string') return {};
    try {
      const parsed = JSON.parse(password);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (_) {
      // Not JSON, treat as plain password
    }
    return {};
  }

  /**
   * Handle eth_submitLogin (ethProxy protocol)
   */
  handleEthSubmitLogin(client, id, params) {
    const [loginData] = params;

    // Parse worker name (format: wallet.workerName or just wallet)
    const parts = loginData.split('.');
    const wallet = parts[0];
    const workerName = parts[1] || 'default';

    client.worker = workerName;
    client.wallet = wallet;
    client.authorized = true;
    client.protocol = 'ethproxy';

    console.log(`✅ Worker authorized (ethProxy): ${client.worker} (${client.wallet})`);

    // Register with orchestrator
    this.orchestrator.registerWorker(client.id, {
      name: workerName,
      wallet: client.wallet,
      gpu: 'auto-detect',
      hashrate: 0,
      capabilities: []
    });

    // ethProxy response: return true
    this.sendResponse(client, id, true);

    // Send initial work
    this.sendEthWork(client);
  }

  /**
   * Handle eth_getWork (ethProxy protocol)
   */
  handleEthGetWork(client, id, params) {
    // Return current work
    const work = this.getCurrentEthWork(client);
    this.sendResponse(client, id, work);
  }

  /**
   * Handle eth_submitWork/eth_submitHashrate (ethProxy protocol)
   */
  handleEthSubmitWork(client, id, params) {
    const [nonce, header, mixDigest] = params;

    console.log(`📊 Share submitted (ethProxy) by ${client.id}`);

    // Validate share (simplified)
    const valid = true; // Accept all for now

    if (valid) {
      this.sendResponse(client, id, true);
      this.emit('share:valid', {
        workerId: client.id,
        difficulty: client.difficulty || 1
      });
    } else {
      this.sendResponse(client, id, false);
      this.emit('share:invalid', { workerId: client.id });
    }
  }

  /**
   * Send work to ethProxy client
   */
  sendEthWork(client) {
    const work = this.getCurrentEthWork(client);

    if (client.socket.writable) {
      console.log(`⛏️  Sent eth work to ${client.id}: ${work[0].slice(0, 18)}...`);
    }
  }

  /**
   * Handle AI job submission (custom HashNHedge protocol extension)
   */
  handleAISubmit(client, id, params) {
    const [jobId, resultData] = params;

    console.log(`🤖 AI job submitted by ${client.id}: job=${jobId}`);

    if (!client.authorized) {
      this.sendError(client, id, 20, 'Unauthorized');
      return;
    }

    // Notify orchestrator of AI job completion
    if (this.orchestrator) {
      this.orchestrator.completeJob(client.id, {
        revenue: resultData && resultData.revenue ? resultData.revenue : 0,
        result: resultData
      });
    }

    this.sendResponse(client, id, true);
    this.emit('ai:completed', {
      workerId: client.id,
      jobId,
      result: resultData
    });
  }

  /**
   * Handle agent heartbeat (orchestrator-aware protocol extension)
   */
  handleAgentHeartbeat(client, id, params) {
    if (!client.authorized) {
      this.sendError(client, id, 20, 'Unauthorized');
      return;
    }

    const [heartbeatData] = params || [{}];
    console.log(`💓 Heartbeat from ${client.worker}: hashrate=${heartbeatData.hashrate || 0} H/s`);

    this.sendResponse(client, id, true);
  }

  /**
   * Handle agent job result (orchestrator-aware protocol extension)
   */
  handleAgentJobResult(client, id, params) {
    if (!client.authorized) {
      this.sendError(client, id, 20, 'Unauthorized');
      return;
    }

    const [result] = params || [{}];
    console.log(`📊 Job result from ${client.worker}: job=${result.jobId} status=${result.status}`);

    if (this.orchestrator && result.status === 'completed') {
      this.orchestrator.completeJob(client.id, {
        revenue: result.revenue || 0,
        result: result
      });
    }

    this.sendResponse(client, id, true);
  }

  /**
   * Get current Ethereum work (for ethProxy)
   */
  getCurrentEthWork(client) {
    // Use JobGenerator to create real, fresh Ethereum work
    const work = this.jobGenerator.generateEthWork(client.difficulty);
    return [
      work.headerHash,
      work.seedHash,
      work.target
    ];
  }

  /**
   * Handle mining.subscribe
   */
  handleSubscribe(client, id, params) {
    client.subscribed = true;

    const sessionId = this.generateSessionId();
    const extranonce1 = this.generateExtranonce();

    client.sessionId = sessionId;
    client.extranonce1 = extranonce1;

    this.sendResponse(client, id, [
      [
        ["mining.set_difficulty", sessionId],
        ["mining.notify", sessionId]
      ],
      extranonce1,
      4 // extranonce2 size
    ]);

    console.log(`✅ Client subscribed: ${client.id}`);
  }

  /**
   * Handle mining.authorize
   */
  handleAuthorize(client, id, params) {
    const [username, password] = params;

    // Parse worker name (format: wallet.workerName)
    const workerName = username.split('.')[1] || 'default';
    client.worker = workerName;
    client.wallet = username.split('.')[0];
    client.authorized = true;

    // Parse capabilities from password (orchestrator-aware agent protocol)
    const capabilities = this._parseCapabilities(password);
    client.capabilities = capabilities;

    console.log(`✅ Worker authorized: ${client.worker} (${client.wallet})`);
    if (Object.keys(capabilities).length > 0) {
      console.log(`   Capabilities: ${JSON.stringify(capabilities)}`);
    }

    // Register with orchestrator including capabilities
    this.orchestrator.registerWorker(client.id, {
      name: workerName,
      wallet: client.wallet,
      gpu: capabilities.gpuVendor || 'auto-detect',
      hashrate: 0,
      capabilities: Object.keys(capabilities).filter(k => capabilities[k] === true),
      vram: capabilities.vram || 0,
      cpuCores: capabilities.cpuCores || 0,
      rawCapabilities: capabilities
    });

    this.sendResponse(client, id, true);

    // Send initial difficulty
    this.sendDifficulty(client, 1);

    // Send initial mining job immediately after authorization
    // The orchestrator will assign a job, but we send a default one to start
    setTimeout(() => {
      if (client.authorized && !client.currentJob) {
        this.sendMiningJob(client, {
          id: `job_${Date.now()}`,
          algorithm: 'sha256d'
        });
      }
    }, 100);
  }

  /**
   * Handle mining.submit (share submission)
   */
  handleSubmit(client, id, params) {
    const [workerName, jobId, extranonce2, ntime, nonce] = params;

    console.log(`📊 Share submitted by ${client.id}: job ${jobId}`);

    // Validate share with proper cryptographic verification
    const valid = this.validateShare(client, jobId, nonce, extranonce2, ntime);

    if (valid) {
      this.sendResponse(client, id, true);

      // Report to orchestrator as partial job completion
      this.emit('share:valid', {
        workerId: client.id,
        jobId,
        difficulty: client.difficulty || 1
      });
    } else {
      this.sendResponse(client, id, false);
      this.emit('share:invalid', { workerId: client.id, jobId });
    }
  }

  /**
   * Validate share with proper cryptographic verification
   */
  validateShare(client, jobId, nonce, extranonce2, ntime) {
    // Basic validation
    if (!client || !jobId || !nonce) {
      console.error('❌ Invalid share parameters');
      return false;
    }

    // Check if client has current job
    if (!client.currentJob || client.currentJob.id !== jobId) {
      console.error('❌ Invalid job ID:', jobId);
      return false;
    }

    // Use ShareValidator for proper validation
    const result = this.validator.validateStratumShare(
      {
        workerName: client.worker,
        jobId: jobId,
        extranonce2: extranonce2 || '00000000',
        ntime: ntime || Math.floor(Date.now() / 1000).toString(16),
        nonce: nonce
      },
      {
        ...client.currentJob,
        extranonce1: client.extranonce1 || '00000000',
        target: client.currentJob.target || Buffer.alloc(32, 0xff)
      }
    );

    if (result.valid) {
      console.log(`✅ Share accepted from ${client.worker}: job=${jobId}, nonce=${nonce}, diff=${client.difficulty || 1}`);
      console.log(`   Hash: ${result.hash}, Difficulty: ${result.difficulty}`);
      return true;
    } else {
      console.error(`❌ Share rejected from ${client.worker}: ${result.error}`);
      return false;
    }
  }

  /**
   * Send job to client (called by orchestrator)
   */
  sendJobToClient(workerId, job, jobType) {
    const client = Array.from(this.clients.values()).find(c => c.id === workerId);
    if (!client || !client.authorized) return;

    if (jobType === 'mining') {
      this.sendMiningJob(client, job);
    } else if (jobType === 'ai') {
      this.sendAIJob(client, job);
    }
  }

  /**
   * Send mining job via mining.notify
   */
  sendMiningJob(client, job) {
    // Use JobGenerator to create a real, structurally valid block template
    const template = this.jobGenerator.generateMiningJob(
      job.algorithm || 'sha256d',
      job.difficulty || client.difficulty || 1
    );

    // Merge any orchestrator-supplied job fields
    const jobId = template.id;
    const prevhash = job.prevhash || template.prevhash;
    const coinb1 = job.coinb1 || template.coinb1;
    const coinb2 = job.coinb2 || template.coinb2;
    const merkle_branch = job.merkle_branch || template.merkle_branch;
    const version = job.version || template.version;
    const nbits = job.nbits || template.nbits;
    const ntime = job.ntime || template.ntime;

    const jobParams = [
      jobId,                     // job_id
      prevhash,                  // prevhash
      coinb1,                    // coinb1
      coinb2,                    // coinb2
      merkle_branch,             // merkle_branch
      version,                   // version
      nbits,                     // nbits
      ntime,                     // ntime
      true                       // clean_jobs
    ];

    // Compute proper target from nbits for share validation
    const target = this._nbitsToTarget(nbits);

    // Store current job for share validation
    client.currentJob = {
      id: jobId,
      prevhash: prevhash,
      coinb1: coinb1,
      coinb2: coinb2,
      merkle_branch: merkle_branch,
      version: version,
      nbits: nbits,
      ntime: ntime,
      timestamp: Date.now(),
      target: target,
      height: template.height
    };

    this.sendNotification(client, 'mining.notify', jobParams);
    console.log(`⛏️  Sent real mining job ${jobId} (height=${template.height}, diff=${template.difficulty}) to ${client.id}`);
  }

  /**
   * Convert compact nBits to a full 32-byte target buffer.
   */
  _nbitsToTarget(nbits) {
    try {
      const compact = parseInt(nbits, 16);
      const exponent = (compact >> 24) & 0xff;
      const mantissa = compact & 0x007fffff;
      const target = Buffer.alloc(32, 0);
      const offset = 32 - (exponent - 3);
      if (offset >= 0 && offset < 32) {
        target.writeUInt32BE(mantissa, offset);
      }
      return target;
    } catch (err) {
      return Buffer.alloc(32, 0xff);
    }
  }

  /**
   * Send AI job (custom method - requires modified miner)
   */
  sendAIJob(client, job) {
    // Custom AI job format
    const jobParams = {
      job_id: job.id,
      task_type: job.task,
      task_data: job.data || {},
      model: job.model || null,
      endpoint: job.endpoint || null,
      timeout: job.timeout || 300
    };

    this.sendNotification(client, 'ai.job', [jobParams]);
    console.log(`🤖 Sent AI job ${job.id} to ${client.id}`);
  }

  /**
   * Send difficulty update
   */
  sendDifficulty(client, difficulty) {
    client.difficulty = difficulty;
    this.sendNotification(client, 'mining.set_difficulty', [difficulty]);
  }

  /**
   * Send JSON-RPC response
   */
  sendResponse(client, id, result) {
    this.send(client, { id, result, error: null });
  }

  /**
   * Send JSON-RPC error
   */
  sendError(client, id, code, message) {
    this.send(client, { id, result: null, error: [code, message, null] });
  }

  /**
   * Send JSON-RPC notification (no id)
   */
  sendNotification(client, method, params) {
    this.send(client, { id: null, method, params });
  }

  /**
   * Send message to client
   */
  send(client, data) {
    try {
      if (!client || !client.socket || client.socket.destroyed) {
        console.error('[Stratum] Cannot send to destroyed socket');
        return false;
      }

      const message = JSON.stringify(data) + '\n';

      if (!client.socket.writable) {
        console.error('[Stratum] Socket not writable');
        return false;
      }

      client.socket.write(message, (err) => {
        if (err) {
          console.error(`[Stratum] Write error to ${client.id}:`, err.message);
        }
      });

      return true;
    } catch (err) {
      console.error(`[Stratum] Send error to ${client.id}:`, err.message);
      return false;
    }
  }

  /**
   * Handle client error
   */
  handleError(client, err) {
    console.error(`❌ Client error ${client.id}:`, err.message);
    this.emit('client:error', { clientId: client.id, error: err });

    // Don't let socket errors crash the server
    try {
      if (client && client.socket && !client.socket.destroyed) {
        client.socket.destroy();
      }
    } catch (cleanupErr) {
      console.error(`[Stratum] Cleanup error:`, cleanupErr.message);
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client) {
    console.log(`🔌 Client disconnected: ${client.id}`);

    if (client.id) {
      this.orchestrator.unregisterWorker(client.id);
    }

    this.clients.delete(client.socket);
    this.emit('client:disconnected', client.id);
  }

  /**
   * Generate session ID (cryptographically secure)
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate extranonce (cryptographically secure)
   */
  generateExtranonce() {
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * Stop server
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('🛑 Stratum server stopped');
        this.emit('server:stopped');
      });
    }
  }

  /**
   * Get connected clients
   */
  getClients() {
    return Array.from(this.clients.values()).map(c => ({
      id: c.id,
      worker: c.worker,
      wallet: c.wallet,
      authorized: c.authorized,
      subscribed: c.subscribed
    }));
  }
}

module.exports = StratumServer;
