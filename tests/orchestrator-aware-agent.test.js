const OrchestratorAwareAgent = require('../orchestrator-aware-agent');
const JobOrchestrator = require('../hybrid-pool/orchestrator');
const StratumServer = require('../hybrid-pool/stratum-server');

jest.mock('ws', () => {
  return {
    OPEN: 1,
    Server: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn()
    }))
  };
});

describe('OrchestratorAwareAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectCapabilities', () => {
    it('should detect CPU-only capabilities when no GPU tools available', () => {
      const agent = new OrchestratorAwareAgent({
        walletAddress: 'test',
        workerName: 'test-worker'
      });

      const caps = agent.capabilities;
      expect(caps.mining).toBe(true);
      expect(caps.cpuCores).toBeGreaterThan(0);
      expect(caps.os).toBeDefined();
    });
  });

  describe('handshake', () => {
    it('should send mining.subscribe on connect', () => {
      const agent = new OrchestratorAwareAgent({
        walletAddress: 'test',
        workerName: 'test-worker'
      });

      const mockWs = {
        readyState: 1,
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn()
      };

      agent.connection = mockWs;
      agent.onConnect();

      const calls = mockWs.send.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const msg = JSON.parse(calls[0][0]);
      expect(msg.method).toBe('mining.subscribe');
      expect(msg.params[0]).toBe('hashnhedge-agent/2.0.0');
    });
  });

  describe('job switching', () => {
    it('should stop mining when AI job arrives', () => {
      const agent = new OrchestratorAwareAgent({
        walletAddress: 'test',
        workerName: 'test-worker'
      });

      agent.miningActive = true;
      agent.currentJobType = 'mining';

      agent.onAIJob([{
        job_id: 'ai_1',
        task_type: 'inference',
        model: 'test-model',
        timeout: 10
      }]);

      expect(agent.miningActive).toBe(false);
      expect(agent.currentJobType).toBe('ai');
      expect(agent.currentJob.jobId).toBe('ai_1');
    });
  });

  describe('stats tracking', () => {
    it('should track shares submitted', () => {
      const agent = new OrchestratorAwareAgent({
        walletAddress: 'test',
        workerName: 'test-worker'
      });

      agent.stats.sharesSubmitted = 5;
      agent.stats.sharesAccepted = 3;

      expect(agent.stats.sharesSubmitted).toBe(5);
      expect(agent.stats.sharesAccepted).toBe(3);
    });
  });
});

describe('StratumServer capability parsing', () => {
  let server;
  let orchestrator;

  beforeEach(() => {
    orchestrator = new JobOrchestrator();
    server = new StratumServer(orchestrator, { port: 33333 });
  });

  afterEach(() => {
    if (server) server.stop();
  });

  describe('_parseCapabilities', () => {
    it('should parse JSON capabilities from password', () => {
      const caps = server._parseCapabilities('{"mining":true,"ai":true,"cuda":true}');
      expect(caps.mining).toBe(true);
      expect(caps.ai).toBe(true);
      expect(caps.cuda).toBe(true);
    });

    it('should return empty object for plain password', () => {
      const caps = server._parseCapabilities('plainpassword');
      expect(Object.keys(caps).length).toBe(0);
    });

    it('should return empty object for null password', () => {
      const caps = server._parseCapabilities(null);
      expect(Object.keys(caps).length).toBe(0);
    });
  });

  describe('handleAuthorize', () => {
    it('should register worker with capabilities', () => {
      const mockSocket = {
        writable: true,
        write: jest.fn(),
        destroyed: false
      };

      const client = {
        id: 'test-client',
        socket: mockSocket,
        authorized: false,
        subscribed: false
      };

      const capabilities = JSON.stringify({ mining: true, ai: true, cuda: true, gpuVendor: 'NVIDIA' });
      server.handleAuthorize(client, 1, ['wallet.worker1', capabilities]);

      expect(client.authorized).toBe(true);
      expect(client.capabilities).toBeDefined();
      expect(client.capabilities.mining).toBe(true);

      const worker = orchestrator.workers.get('test-client');
      expect(worker).toBeDefined();
      expect(worker.capabilities).toContain('mining');
      expect(worker.capabilities).toContain('ai');
      expect(worker.capabilities).toContain('cuda');
      expect(worker.gpu).toBe('NVIDIA');
    });
  });
});

describe('JobOrchestrator with capabilities', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new JobOrchestrator();
  });

  it('should match AI job to worker with AI capability', () => {
    orchestrator.registerWorker('worker-1', {
      gpu: 'RTX 4090',
      capabilities: ['mining', 'ai', 'cuda'],
      vram: 24,
      cpuCores: 8
    });

    orchestrator.addAIJob({
      task: 'inference',
      requirements: {
        capabilities: ['ai'],
        minVRAM: 8
      },
      priority: 9
    });

    const assignment = orchestrator.assignments.get('worker-1');
    expect(assignment).toBeDefined();
    expect(assignment.type).toBe('ai');
  });

  it('should not match AI job to worker without AI capability', () => {
    orchestrator.registerWorker('worker-2', {
      gpu: 'CPU',
      capabilities: ['mining'],
      vram: 0,
      cpuCores: 4
    });

    orchestrator.addAIJob({
      task: 'inference',
      requirements: {
        capabilities: ['ai']
      },
      priority: 9
    });

    const assignment = orchestrator.assignments.get('worker-2');
    expect(assignment).toBeUndefined();
  });

  it('should check minCpuCores requirement', () => {
    orchestrator.registerWorker('worker-3', {
      gpu: 'CPU',
      capabilities: ['mining'],
      vram: 0,
      cpuCores: 2
    });

    const meets = orchestrator.workerMeetsRequirements(
      orchestrator.workers.get('worker-3'),
      { minCpuCores: 4 }
    );
    expect(meets).toBe(false);
  });
});
