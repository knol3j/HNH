import { User, UserCredentials } from '../types';
import { apiClient } from './apiClient';

// Cache for user data
let cachedUser: User | null = null;

export const API_URL = import.meta.env.VITE_API_URL || 'https://api-production-5f42.up.railway.app';

export const setCachedUser = (user: User | null) => {
    cachedUser = user;
};

export const registerUser = async (creds: UserCredentials): Promise<User | null> => {
    try {
        const data = await apiClient.post<{ token: string; user: User }>('/auth/register', creds);
        
        localStorage.setItem('hnh_token', data.token);
        localStorage.setItem('hnh_user', JSON.stringify(data.user));
        cachedUser = data.user;
        
        return data.user;
    } catch (e) {
        console.error("[AUTH] Register failed:", e);
        throw e;
    }
};

export const loginUser = async (creds: UserCredentials): Promise<User | null> => {
    try {
        const data = await apiClient.post<{ token: string; user: User }>('/auth/login', creds);
        
        localStorage.setItem('hnh_token', data.token);
        localStorage.setItem('hnh_user', JSON.stringify(data.user));
        cachedUser = data.user;
        
        return data.user;
    } catch (e) {
        console.error("[AUTH] Login failed:", e);
        throw e;
    }
};

export const logoutUser = () => {
    localStorage.removeItem('hnh_token');
    localStorage.removeItem('hnh_user');
    cachedUser = null;
    window.dispatchEvent(new Event('auth-state-changed'));
};

export const getCurrentUser = (): User | null => {
    if (cachedUser) return cachedUser;

    const token = localStorage.getItem('hnh_token');
    if (!token) return null;

    const storedUser = localStorage.getItem('hnh_user');
    if (storedUser) {
        try {
            cachedUser = JSON.parse(storedUser);
            return cachedUser;
        } catch {
            // Clean up corrupted storage
            localStorage.removeItem('hnh_user');
        }
    }

    // Default placeholder while fetching
    return {
        id: 'session',
        username: 'User',
        tier: 'free',
        role: 'USER',
        createdAt: 0,
        referralCode: '',
        referralBonus: 0
    };
};

export const fetchCurrentUser = async (): Promise<User | null> => {
    try {
        const user = await apiClient.get<User>('/user/profile');
        cachedUser = user;
        localStorage.setItem('hnh_user', JSON.stringify(user));
        return user;
    } catch (e) {
        // If 401/403, apiClient throws, we logout
        logoutUser();
        return null;
    }
};

export const getReferrals = async (): Promise<any[]> => {
    try {
        return await apiClient.get<any[]>('/user/referrals');
    } catch (e) {
        return [];
    }
};

export const updateUserTier = async (userId: string, tier: string): Promise<boolean> => {
    try {
        await apiClient.patch('/user/tier', { tier }, { params: { userId } });
        return true;
    } catch (e) {
        return false;
    }
};

export const hasAuthToken = (): boolean => {
    return !!localStorage.getItem('hnh_token');
};
