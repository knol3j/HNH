
import { User, UserCredentials } from '../types';

// Railway backend URL - uses VITE_API_URL in production, localhost only for local dev
// Railway backend URL - must be set in environment variables
export const API_URL = import.meta.env.VITE_API_URL || '';

export const registerUser = async (creds: UserCredentials): Promise<User | null> => {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        if (!res.ok) {
            const errorText = await res.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            throw new Error(errorData.error || 'Registration failed');
        }

        const data = await res.json();
        localStorage.setItem('hnh_token', data.token); // Store JWT
        return data.user;
    } catch (e) {
        console.error("Register failed:", e);
        throw e; // Re-throw to allow error handling in UI
    }
};

export const loginUser = async (creds: UserCredentials): Promise<User | null> => {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        if (!res.ok) {
            const errorText = await res.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            throw new Error(errorData.error || 'Login failed');
        }

        const data = await res.json();
        localStorage.setItem('hnh_token', data.token);
        return data.user;
    } catch (e) {
        console.error("Login failed:", e);
        throw e; // Re-throw to allow error handling in UI
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

    if (token === 'demo-mode') {
        return {
            id: 'demo-user',
            username: 'Demo User',
            tier: 'pro',
            createdAt: Date.now(),
            passwordHash: '',
            referralCode: 'DEMO123',
            referralBonus: 50
        };
    }

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
    const token = localStorage.getItem('hnh_token');
    if (!token) return [];

    try {
        const res = await fetch(`${API_URL}/user/referrals`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch referrals:', e);
    }
    return [];
};

export const updateUserTier = async (userId: string, tier: string): Promise<boolean> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) return false;

    try {
        const res = await fetch(`${API_URL}/user/tier`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ tier })
        });
        return res.ok;
    } catch (e) {
        console.error('Failed to update tier:', e);
        return false;
    }
};
