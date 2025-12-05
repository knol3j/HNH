import { ComputeNode, NetworkStats, ActiveJob, ProviderStats, ModelTemplate } from '../types';

export const MOCK_NODES: ComputeNode[] = [
  {
    id: 'node-01',
    name: 'Nebula-Cluster-Alpha',
    gpuModel: 'NVIDIA H100',
    vram: 80,
    tflops: 1979,
    pricePerHour: 2.50,
    region: 'US-East',
    availability: 98,
    status: 'IDLE',
    provider: '0x3a...9f2',
    isVerified: true,
    slaTier: 'Enterprise'
  },
  {
    id: 'node-02',
    name: 'Quantum-Rig-X',
    gpuModel: 'NVIDIA A100',
    vram: 40,
    tflops: 312,
    pricePerHour: 1.10,
    region: 'EU-Central',
    availability: 100,
    status: 'BUSY',
    provider: '0x7b...c1a',
    isVerified: true,
    slaTier: 'Gold'
  },
  {
    id: 'node-03',
    name: 'Consumer-Grade-01',
    gpuModel: 'RTX 4090',
    vram: 24,
    tflops: 82.6,
    pricePerHour: 0.45,
    region: 'Asia-South',
    availability: 85,
    status: 'IDLE',
    provider: '0x1c...e4d',
    isVerified: false,
    slaTier: 'Standard'
  },
  {
    id: 'node-04',
    name: 'Render-Farm-B',
    gpuModel: 'RTX 3090',
    vram: 24,
    tflops: 35.6,
    pricePerHour: 0.25,
    region: 'US-West',
    availability: 92,
    status: 'IDLE',
    provider: '0x9d...a2b',
    isVerified: false,
    slaTier: 'Standard'
  },
  {
    id: 'node-05',
    name: 'ML-Training-Pod',
    gpuModel: 'NVIDIA H100',
    vram: 80,
    tflops: 1979,
    pricePerHour: 2.45,
    region: 'US-East',
    availability: 99,
    status: 'BUSY',
    provider: '0x4f...11a',
    isVerified: true,
    slaTier: 'Enterprise'
  }
];

// Snapshot data - Represents a "Last Known State" from the network
export const MOCK_STATS: NetworkStats = {
  activeNodes: 1420,
  totalTflops: 45000,
  jobsRunning: 892,
  networkUtilization: 68,
  avgPricePerFLOP: 0.002
};

export const MOCK_JOBS: ActiveJob[] = []; // No active jobs by default in real mode

export const MOCK_PROVIDER_STATS: ProviderStats = {
  earnings24h: 0,
  totalEarnings: 0,
  reputationScore: 100, // New nodes start with 100
  uptime: 0,
  activeJobs: 0
};

export const DEPLOYMENT_TEMPLATES: ModelTemplate[] = [
  {
    id: 't-1',
    name: 'Llama 3 70B Fine-Tune',
    description: 'Fine-tune Meta\'s latest model on a custom JSONL dataset.',
    icon: 'Brain',
    category: 'LLM',
    prompt: 'I want to fine-tune Llama 3 70B using LoRA on a custom dataset of 100k samples. I need high VRAM (A100/H100) and fast interconnects for distributed training. Estimate roughly 4 hours.'
  },
  {
    id: 't-2',
    name: 'Stable Diffusion XL Render',
    description: 'Batch image generation with ControlNet support.',
    icon: 'Image',
    category: 'Image',
    prompt: 'I need to run a batch inference job using Stable Diffusion XL with ControlNet. I have 5000 prompts to process. Consumer grade GPUs (RTX 4090) are acceptable to keep costs low.'
  },
  {
    id: 't-3',
    name: 'Whisper Audio Transcription',
    description: 'Process large-scale audio datasets into text.',
    icon: 'Mic',
    category: 'Data',
    prompt: 'I have 200 hours of .wav audio files that need transcription using OpenAI Whisper Large v3. High CPU/RAM is less important than raw CUDA core count for inference throughput.'
  }
];