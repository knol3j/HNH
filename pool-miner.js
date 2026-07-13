#!/usr/bin/env node

/**
 * HashNHedge Pool Miner
 * Thin wrapper around OrchestratorAwareAgent.
 * Usage: node pool-miner.js
 * Env: WALLET_ADDRESS, WORKER_NAME, POOL_WS_URL
 */

const OrchestratorAwareAgent = require('./orchestrator-aware-agent');
const os = require('os');

const agent = new OrchestratorAwareAgent({
  poolUrl: process.env.POOL_WS_URL || 'ws://localhost:3333',
  walletAddress: process.env.WALLET_ADDRESS || 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc',
  workerName: process.env.WORKER_NAME || `agent-${os.hostname()}`,
  useWs: true
});

console.log('[Miner] Starting HashNHedge Pool Miner...');
console.log('[Miner] Capabilities:', agent.capabilities);

agent.connect();

process.on('SIGINT', () => {
  console.log('\n[Miner] Shutting down...');
  agent.disconnect();
  process.exit(0);
});
