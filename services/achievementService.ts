import { API_URL } from './authService';

// Types for achievements
export interface Achievement {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string | null;
    category: string;
    threshold: number | null;
    xpReward: number;
    unlockedAt?: string;
}

export interface UserAchievementsResponse {
    unlocked: Achievement[];
    available: Achievement[];
    total: number;
    unlockedCount: number;
}

// Get user's achievements
export const getUserAchievements = async (): Promise<UserAchievementsResponse | null> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) return null;

    try {
        const res = await fetch(`${API_URL}/user/achievements`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch achievements:', e);
    }
    return null;
};

// Get achievement progress (for progress-based achievements)
export const getAchievementProgress = (achievement: Achievement, userStats: { totalShares: number; currentStreak: number; longestStreak: number }): number => {
    if (!achievement.threshold) return 0;

    switch (achievement.code) {
        case 'first_share':
        case 'shares_100':
        case 'shares_1k':
        case 'shares_10k':
        case 'shares_100k':
            return Math.min(100, (userStats.totalShares / achievement.threshold) * 100);
        case 'streak_3':
        case 'streak_7':
        case 'streak_30':
        case 'streak_100':
            const maxStreak = Math.max(userStats.currentStreak, userStats.longestStreak);
            return Math.min(100, (maxStreak / achievement.threshold) * 100);
        default:
            return 0;
    }
};

// Get achievement icon with fallback
export const getAchievementIcon = (achievement: Achievement): string => {
    if (achievement.icon) return achievement.icon;

    // Fallback icons by category
    switch (achievement.category) {
        case 'milestone':
            return '🏅';
        case 'mining':
            return '⛏️';
        case 'streak':
            return '🔥';
        case 'social':
            return '🤝';
        default:
            return '🏆';
    }
};

// Get category display name
export const getCategoryDisplayName = (category: string): string => {
    switch (category) {
        case 'milestone':
            return 'Milestones';
        case 'mining':
            return 'Mining';
        case 'streak':
            return 'Streaks';
        case 'social':
            return 'Social';
        default:
            return category.charAt(0).toUpperCase() + category.slice(1);
    }
};

// Group achievements by category
export const groupAchievementsByCategory = (achievements: Achievement[]): Record<string, Achievement[]> => {
    return achievements.reduce((acc, achievement) => {
        const category = achievement.category || 'other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(achievement);
        return acc;
    }, {} as Record<string, Achievement[]>);
};
