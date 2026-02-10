
export interface ComputeNode {
  id: string;
  name: string;
  gpuModel: string;
  vram: number; // in GB
  tflops: number;
  pricePerHour: number;
  region: string;
  availability: number; // 0-100%
  status: 'IDLE' | 'BUSY' | 'OFFLINE';
  provider: string;
  isVerified: boolean; // New: Trust signal
  slaTier: 'Standard' | 'Gold' | 'Enterprise'; // New: Reliability metric
}

export interface NetworkStats {
  activeNodes: number;
  totalTflops: number;
  jobsRunning: number;
  networkUtilization: number; // %
  avgPricePerFLOP: number;
}

export interface JobSpec {
  title: string;
  description: string;
  recommendedGpu: string;
  estimatedDuration: string;
  maxPrice: number;
  reasoning: string;
}

export interface ActiveJob {
  id: string;
  title: string;
  nodeId: string;
  status: 'PROVISIONING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  startTime: string;
  costSoFar: number;
  logs: string[];
}

export interface ProviderStats {
  earnings24h: number;
  totalEarnings: number;
  reputationScore: number; // 0-100
  uptime: number; // %
  activeJobs: number;
}

export interface HardwareMonitor {
  temp: number; // Celsius
  power: number; // Watts
  fanSpeed: number; // %
  memoryUsage: number; // %
}

export interface HardwareTelemetry {
  gpu_temp: number;
  gpu_util: number;
  fan_speed: number;
  power_draw: number;
  vram_used: number;
  hashrate: number;
  logs?: string[];
  verified_shares?: number;
  coin?: string;
  wallet?: string;
}

// New: Preconfigured Deployment Templates
export interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  prompt: string;
  category: 'LLM' | 'Image' | 'Data';
}

// Navigation types - Expanded for full feature set
export type View =
  | 'DASHBOARD'
  | 'WALLETS'
  | 'MARKETPLACE'
  | 'DEPLOY'
  | 'PROVIDER'
  | 'DEX'
  | 'SECURITY'
  | 'TOKEN_CREATOR'
  | 'WHITE_LABEL'
  | 'REFERRALS'
  | 'UPGRADE'
  | 'LANDING'
  | 'ANALYTICS'
  | 'WORKERS'
  | 'OVERCLOCK'
  | 'DOCS'
  | 'FORUM'
  | 'DIAGNOSTICS';

// Algorithm types
export type Algorithm = 'KawPow' | 'RandomX' | 'Autolykos2' | 'Llama3-70b' | 'Etchash';

// Supported mining coins
export type MiningCoin = 'XMR' | 'RVN' | 'ETC' | 'ERG' | 'KAS';

// Mining wallet interface
export interface MiningWallet {
  id: string;
  coin: MiningCoin;
  address: string;
  pool: string;
  workerName: string;
  createdAt: number;
  updatedAt: number;
  isValid: boolean;
  lastValidated?: number;
}

// Mining wallet form data
export interface WalletFormData {
  coin: MiningCoin;
  address: string;
  pool: string;
  workerName: string;
}

// Pool configuration for each coin
export interface PoolConfig {
  coin: MiningCoin;
  name: string;
  defaultPool: string;
  exampleAddress: string;
  website: string;
}

// Ethereum Window Type
export interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
}


// Auth Types
export type UserTier = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  username: string;
  passwordHash: string; // SHA-256
  createdAt: number;
  tier: UserTier;
  role: 'USER' | 'ADMIN'; // Added Admin Role
  referralCode: string;
  referredBy?: string; // referralCode of who invited this user
  referralBonus: number; // Accumulated bonus shares from referrals
}

export interface UserCredentials {
  username: string;
  password: string; // Plaintext (before hashing)
  referralCode?: string; // Optional: code to apply on signup
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
