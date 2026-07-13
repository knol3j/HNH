/**
 * WebSocket Stratum Server Wrapper
 * Allows stratum protocol over WebSocket for compatibility with web services
 */

const WebSocket = require('ws');
const net = require('net');
const crypto = require('crypto');
const JobGenerator = require('../hybrid-pool/job-generator');

class StratumWebSocketServer {
  constructor(httpServer, config = {}) {
    this.config = {
      path: '/stratum',
      port: config.port || 3333,
      ...config
    };

    this.orchestrator = config.orchestrator || null;
    this.jobGenerator = new JobGenerator(config.jobGenerator);
    this.clients = new Map();
    this.setupWebSocketServer(httpServer);
    this.setupTCPServer();

    // Listen for orchestrator job assignments if available
    if (this.orchestrator) {
      this.orchestrator.on('worker:job', ({ workerId, job, jobType }) => {
        this.sendJobToClient(workerId, job, jobType);
      });
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
   * Send AI job (custom method - requires orchestrator-aware miner)
   */
  sendAIJob(client, job) {
    const jobParams = {
      job_id: job.id,
      task_type: job.task,
      task_data: job.data || {},
      model: job.model || null,
      endpoint: job.endpoint || null,
      timeout: job.timeout || 300
    };

    this.sendNotification(client, 'ai.job', [jobParams]);
    console.log(`[STRATUM] Sent AI job ${job.id} to ${client.id}`);
  }

  setupWebSocketServer(httpServer) {
    this.wss = new WebSocket.Server({
      server: httpServer,
      path: this.config.path
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = `ws-${crypto.randomBytes(8).toString('hex')}`;
      console.log(`[STRATUM WS] New WebSocket connection: ${clientId}`);

      const client = {
        id: clientId,
        type: 'websocket',
        ws: ws,
        authorized: false,
        subscribed: false,
        buffer: ''
      };

      this.clients.set(ws, client);

      ws.on('message', (data) => {
        this.handleMessage(client, data.toString());
      });

      ws.on('close', () => {
        console.log(`[STRATUM WS] Client disconnected: ${clientId}`);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error(`[STRATUM WS] Error for ${clientId}:`, error.message);
      });
    });

    console.log(`Stratum WebSocket server listening on ${this.config.path}`);
  }

  setupTCPServer() {
    this.tcpServer = net.createServer((socket) => {
      const clientId = `tcp-${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`[STRATUM TCP] New TCP connection: ${clientId}`);

      const client = {
        id: clientId,
        type: 'tcp',
        socket: socket,
        authorized: false,
        subscribed: false,
        buffer: ''
      };

      this.clients.set(socket, client);

      socket.setEncoding('utf8');
      socket.setKeepAlive(true);

      socket.on('data', (data) => {
        client.buffer += data;
        const lines = client.buffer.split('\n');
        client.buffer = lines.pop();

        for (const line of lines) {
          if (line.trim()) {
            this.handleMessage(client, line.trim());
          }
        }
      });

      socket.on('close', () => {
        console.log(`[STRATUM TCP] Client disconnected: ${clientId}`);
        this.clients.delete(socket);
      });

      socket.on('error', (error) => {
        console.error(`[STRATUM TCP] Error for ${clientId}:`, error.message);
      });
    });

    this.tcpServer.listen(this.config.port, '0.0.0.0', () => {
      console.log(`Stratum TCP server listening on port ${this.config.port}`);
    }).on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`Port ${this.config.port} in use, TCP stratum disabled (WebSocket still available)`);
      } else {
        console.error(`Stratum TCP server error:`, error.message);
      }
    });
  }

  handleMessage(client, message) {
    try {
      const msg = JSON.parse(message);
      console.log(`[STRATUM] Received from ${client.id}:`, msg.method || 'response');

      if (msg.method) {
        this.handleRequest(client, msg);
      }
    } catch (error) {
      console.error(`[STRATUM] Invalid JSON from ${client.id}:`, message);
      this.sendError(client, null, -32700, 'Parse error');
    }
  }

  handleRequest(client, msg) {
    const { id, method, params } = msg;

    switch (method) {
      case 'mining.subscribe':
        this.handleSubscribe(client, id, params);
        break;
      case 'mining.authorize':
        this.handleAuthorize(client, id, params);
        break;
      case 'mining.submit':
        this.handleSubmit(client, id, params);
        break;
      case 'eth_submitLogin':
        this.handleEthSubmitLogin(client, id, params);
        break;
      case 'eth_getWork':
        this.handleEthGetWork(client, id, params);
        break;
      case 'eth_submitWork':
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

  handleSubscribe(client, id, params) {
    client.subscribed = true;
    client.sessionId = crypto.randomBytes(16).toString('hex');
    client.extranonce1 = crypto.randomBytes(4).toString('hex');

    this.sendResponse(client, id, [
      [
        ["mining.set_difficulty", client.sessionId],
        ["mining.notify", client.sessionId]
      ],
      client.extranonce1,
      4
    ]);

    console.log(`[STRATUM] Client subscribed: ${client.id}`);

    setTimeout(() => {
      this.sendNotification(client, 'mining.set_difficulty', [1]);
    }, 100);
  }

  handleAuthorize(client, id, params) {
    if (!Array.isArray(params) || params.length < 1) {
      this.sendResponse(client, id, false);
      return;
    }

    const usernameParam = String(params[0] || '');

    if (usernameParam.length < 1 || usernameParam.length > 200) {
      this.sendResponse(client, id, false);
      return;
    }

    const parts = usernameParam.split('.');
    const wallet = parts[0] || '';
    const workerName = parts[1] || 'default';

    client.wallet = wallet ? String(wallet).slice(0, 100) : '';
    client.worker = workerName ? String(workerName).replace(/[^\w-]/g, '').slice(0, 50) : 'default';
    client.authorized = true;

    // Parse capabilities from password (orchestrator-aware agent protocol)
    const password = params[1] || '';
    const capabilities = this._parseCapabilities(password);
    client.capabilities = capabilities;

    console.log(`[STRATUM] Worker authorized: ${client.worker} (wallet: ${client.wallet.substring(0, 12)}...)`);
    if (Object.keys(capabilities).length > 0) {
      console.log(`   Capabilities: ${JSON.stringify(capabilities)}`);
    }

    // Register with orchestrator if available
    if (this.orchestrator) {
      this.orchestrator.registerWorker(client.id, {
        name: client.worker,
        wallet: client.wallet,
        gpu: capabilities.gpuVendor || 'auto-detect',
        hashrate: 0,
        capabilities: Object.keys(capabilities).filter(k => capabilities[k] === true),
        vram: capabilities.vram || 0,
        cpuCores: capabilities.cpuCores || 0,
        rawCapabilities: capabilities
      });
    }

    this.sendResponse(client, id, true);

    setTimeout(() => {
      this.sendMiningJob(client);
    }, 100);
  }

  handleSubmit(client, id, params) {
    const [workerName, jobId, extranonce2, ntime, nonce] = params;

    console.log(`[STRATUM] Share submitted by ${client.id}: job ${jobId}`);

    // Basic validation using currentJob if available
    if (client.currentJob && client.currentJob.id === jobId) {
      console.log(`[STRATUM] Share validated for job ${jobId}`);
    }

    this.sendResponse(client, id, true);
  }

  handleEthSubmitLogin(client, id, params) {
    const [loginData] = params;
    const [wallet, workerName] = loginData.split('.');

    client.wallet = wallet;
    client.worker = workerName || 'default';
    client.authorized = true;
    client.protocol = 'ethproxy';

    console.log(`[STRATUM] Worker authorized (ethProxy): ${client.worker}`);

    this.sendResponse(client, id, true);

    setTimeout(() => {
      this.sendEthWork(client);
    }, 100);
  }

  handleEthGetWork(client, id, params) {
    const work = this.getCurrentEthWork(client);
    this.sendResponse(client, id, work);
  }

  handleEthSubmitWork(client, id, params) {
    console.log(`[STRATUM] Share submitted (ethProxy) by ${client.id}`);
    this.sendResponse(client, id, true);
  }

  handleAISubmit(client, id, params) {
    const [jobId, resultData] = params;

    console.log(`[STRATUM] AI job submitted by ${client.id}: job=${jobId}`);

    if (!client.authorized) {
      this.sendError(client, id, 20, 'Unauthorized');
      return;
    }

    if (this.orchestrator) {
      this.orchestrator.completeJob(client.id, {
        revenue: resultData && resultData.revenue ? resultData.revenue : 0,
        result: resultData
      });
    }

    this.sendResponse(client, id, true);
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
    console.log(`[STRATUM] Heartbeat from ${client.worker}: hashrate=${heartbeatData.hashrate || 0} H/s`);

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
    console.log(`[STRATUM] Job result from ${client.worker}: job=${result.jobId} status=${result.status}`);

    if (this.orchestrator && result.status === 'completed') {
      this.orchestrator.completeJob(client.id, {
        revenue: result.revenue || 0,
        result: result
      });
    }

    this.sendResponse(client, id, true);
  }

  sendMiningJob(client, job) {
    const template = this.jobGenerator.generateMiningJob(
      job && job.algorithm ? job.algorithm : 'sha256d',
      client.difficulty || 1
    );

    client.currentJob = {
      id: template.id,
      prevhash: template.prevhash,
      coinb1: template.coinb1,
      coinb2: template.coinb2,
      merkle_branch: template.merkle_branch,
      version: template.version,
      nbits: template.nbits,
      ntime: template.ntime,
      timestamp: Date.now(),
      target: this._nbitsToTarget(template.nbits),
      height: template.height
    };

    this.sendNotification(client, 'mining.notify', [
      template.id,
      template.prevhash,
      template.coinb1,
      template.coinb2,
      template.merkle_branch,
      template.version,
      template.nbits,
      template.ntime,
      template.clean_jobs
    ]);

    console.log(`[STRATUM] Sent real mining job ${template.id} (height=${template.height}) to ${client.id}`);
  }

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

  sendEthWork(client) {
    const work = this.getCurrentEthWork(client);
    console.log(`[STRATUM] Sent eth work to ${client.id}: ${work[0].slice(0, 18)}...`);
  }

  getCurrentEthWork(client) {
    const work = this.jobGenerator.generateEthWork(client.difficulty);
    return [
      work.headerHash,
      work.seedHash,
      work.target
    ];
  }

  sendResponse(client, id, result) {
    this.send(client, { id, result, error: null });
  }

  sendError(client, id, code, message) {
    this.send(client, { id, result: null, error: [code, message, null] });
  }

  sendNotification(client, method, params) {
    this.send(client, { id: null, method, params });
  }

  send(client, data) {
    const message = JSON.stringify(data) + '\n';

    try {
      if (client.type === 'websocket' && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      } else if (client.type === 'tcp' && client.socket.writable) {
        client.socket.write(message);
      }
    } catch (error) {
      console.error(`[STRATUM] Send error to ${client.id}:`, error.message);
    }
  }

  getClients() {
    return Array.from(this.clients.values()).map(c => ({
      id: c.id,
      type: c.type,
      worker: c.worker,
      wallet: c.wallet,
      authorized: c.authorized,
      subscribed: c.subscribed
    }));
  }

  close() {
    console.log('[STRATUM] Shutting down...');

    this.wss.close();

    if (this.tcpServer.listening) {
      this.tcpServer.close();
    }

    for (const [conn, client] of this.clients.entries()) {
      if (client.type === 'websocket') {
        conn.close();
      } else {
        conn.end();
      }
    }

    this.clients.clear();
  }
}

module.exports = StratumWebSocketServer;
