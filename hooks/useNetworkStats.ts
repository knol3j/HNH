import { useState, useEffect } from 'react';
import { NetworkStats } from '../types';
import * as networkService from '../services/networkService';
import { getNetworkStatusAnalysis } from '../services/geminiService';

export const useNetworkStats = () => {
    const [stats, setStats] = useState<NetworkStats>({
        activeNodes: 0,
        totalTflops: 0,
        jobsRunning: 0,
        networkUtilization: 0,
        avgPricePerFLOP: 0
    });
    const [aiAnalysis, setAiAnalysis] = useState<string>('');

    useEffect(() => {
        const fetchStats = async () => {
            const data = await networkService.fetchNetworkStats();
            setStats(data);
        };

        fetchStats();
        const interval = setInterval(fetchStats, 10000); // 10s poll for network stats
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (stats.activeNodes === 0 && stats.totalTflops === 0) return;
        
        const timeoutId = setTimeout(async () => {
            const analysis = await getNetworkStatusAnalysis(stats);
            setAiAnalysis(analysis);
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [stats.activeNodes, stats.jobsRunning, stats.totalTflops]);

    return { stats, aiAnalysis };
};
