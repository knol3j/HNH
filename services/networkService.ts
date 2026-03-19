import { ComputeNode, NetworkStats, ProviderStats, ModelTemplate } from '../types';
import { apiClient } from './apiClient';

/**
 * Fetch available compute nodes from the network
 */
export const fetchComputeNodes = async (): Promise<ComputeNode[]> => {
    try {
        return await apiClient.get<ComputeNode[]>('/network/nodes');
    } catch (e) {
        return [];
    }
};

/**
 * Fetch real-time network statistics
 */
export const fetchNetworkStats = async (): Promise<NetworkStats> => {
    try {
        return await apiClient.get<NetworkStats>('/network/stats');
    } catch (e) {
        return {
            activeNodes: 0,
            totalTflops: 0,
            jobsRunning: 0,
            networkUtilization: 0,
            avgPricePerFLOP: 0
        };
    }
};

/**
 * Fetch provider-specific stats (for logged in providers)
 */
export const fetchProviderStats = async (): Promise<ProviderStats> => {
    try {
        return await apiClient.get<ProviderStats>('/provider/stats');
    } catch (e) {
        return {
            earnings24h: 0,
            totalEarnings: 0,
            reputationScore: 100,
            uptime: 0,
            activeJobs: 0
        };
    }
};

/**
 * Register a new compute node to the network
 */
export const registerNode = async (nodeData: Partial<ComputeNode>): Promise<ComputeNode | null> => {
    try {
        return await apiClient.post<ComputeNode>('/network/nodes', nodeData);
    } catch (e) {
        return null;
    }
};

/**
 * Deployment templates - these are static configurations, not fake data
 */
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

/**
 * Fetch total registered user count for landing page
 */
export const fetchUserCount = async (): Promise<number> => {
    try {
        const data = await apiClient.get<{ count: number }>('/stats/users');
        return data.count || 0;
    } catch (e) {
        return 0;
    }
};
