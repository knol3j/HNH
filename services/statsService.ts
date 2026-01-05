import { API_URL } from './authService';

// Types for stats
export interface UserStats {
    id: string;
    userId: string;
    totalShares: number;
    totalMinedUsd: number;
    totalMiningTime: number;
    currentStreak: number;
    longestStreak: number;
    lastMiningDate: string | null;
    level: number;
    xp: number;
    rank: string;
    updatedAt: string;
}

export interface StatsSnapshot {
    id: string;
    userId: string;
    period: string;
    timestamp: string;
    totalShares: number;
    avgHashrate: number;
    totalMined: number;
    miningMinutes: number;
}

export interface MiningSession {
    id: string;
    userId: string;
    coin: string;
    poolUrl: string;
    startTime: string;
    endTime: string | null;
    totalShares: number;
    acceptedShares: number;
    rejectedShares: number;
    avgHashrate: number;
    peakHashrate: number;
    agentId: string | null;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    tier: string;
    value: number;
    level: number;
    rankTitle: string;
}

// Get user's lifetime stats
export const getUserStats = async (): Promise<{ stats: UserStats; history: StatsSnapshot[]; activeSessions: number } | null> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) return null;

    try {
        const res = await fetch(`${API_URL}/user/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch user stats:', e);
    }
    return null;
};

// Get stats history for charts
export const getStatsHistory = async (period: 'hourly' | 'daily' = 'daily', days: number = 30): Promise<StatsSnapshot[]> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) return [];

    try {
        const res = await fetch(`${API_URL}/user/stats/history?period=${period}&days=${days}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch stats history:', e);
    }
    return [];
};

// Get mining sessions
export const getMiningSessions = async (limit: number = 50): Promise<MiningSession[]> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) return [];

    try {
        const res = await fetch(`${API_URL}/user/sessions?limit=${limit}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch mining sessions:', e);
    }
    return [];
};

// Get leaderboard
export const getLeaderboard = async (
    metric: 'totalShares' | 'totalMinedUsd' | 'longestStreak' | 'level' | 'xp' = 'totalShares',
    limit: number = 100
): Promise<{ leaderboard: LeaderboardEntry[]; userRank: number | null; metric: string }> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) return { leaderboard: [], userRank: null, metric };

    try {
        const res = await fetch(`${API_URL}/leaderboard?metric=${metric}&limit=${limit}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch leaderboard:', e);
    }
    return { leaderboard: [], userRank: null, metric };
};

// Calculate XP needed for next level
export const getXpForNextLevel = (currentLevel: number): number => {
    const levels = [0, 50, 150, 350, 650, 1000, 1500, 2500, 4000, 6000];
    if (currentLevel >= levels.length) return Infinity;
    return levels[currentLevel];
};

// Get current level progress
export const getLevelProgress = (xp: number, level: number): number => {
    const levels = [0, 50, 150, 350, 650, 1000, 1500, 2500, 4000, 6000];
    if (level >= levels.length) return 100;
    const currentLevelXp = levels[level - 1] || 0;
    const nextLevelXp = levels[level];
    const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    return Math.min(100, Math.max(0, progress));
};

// Format mining time
export const formatMiningTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return `${days}d ${hours}h`;
};
