
import { User, UserCredentials } from '../types';

// TODO: In production, this URL should come from env var (VITE_API_URL)
// TODO: In production, this URL should come from env var (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'; // Default to local for dev, Railway URL for prod

export const registerUser = async (creds: UserCredentials): Promise<User | null> => {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        localStorage.setItem('hnh_token', data.token); // Store JWT
        return data.user;
    } catch (e) {
        console.error("Register failed:", e);
        return null;
    }
};

export const loginUser = async (creds: UserCredentials): Promise<User | null> => {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        localStorage.setItem('hnh_token', data.token);
        return data.user;
    } catch (e) {
        console.error("Login failed:", e);
        return null;
    }
};

export const logoutUser = () => {
    localStorage.removeItem('hnh_token');
    // window.location.reload(); // Optional: reset state
};

export const getCurrentUser = (): User | null => {
    // With JWT, we can't fully know user details without decoding or fetching profile.
    // For sync checks, we check token existence.
    // Ideally we should use a React Context/Hook for async auth state.
    // This function signature is synchronous which is tricky for async backend.

    // TEMPORARY ADAPTER: Return minimal user if token exists to satisfy TS
    const token = localStorage.getItem('hnh_token');
    if (!token) return null;

    // In a real app we 'decode' the token here or return a cached user object
    return {
        id: 'session',
        username: 'User',
        tier: 'free',
        createdAt: 0,
        passwordHash: '',
        referralCode: '',
        referralBonus: 0
    };
};

// Async version recommended for real backend
export const fetchCurrentUser = async (): Promise<User | null> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) return null;

    try {
        const res = await fetch(`${API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            return user;
        }
    } catch (e) { }
    return null;
}

export const getReferrals = async (referralCode: string): Promise<any[]> => {
    // TODO: implement real backend call
    return [];
};

export const updateUserTier = async (userId: string, tier: string): Promise<boolean> => {
    // TODO: implement real backend call
    return true;
};
