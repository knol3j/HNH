
import { User, UserCredentials } from '../types';

// Railway backend URL - uses VITE_API_URL in production, localhost only for local dev
// Railway backend URL - must be set in environment variables
// Railway backend URL - hardcoded to ensure it works
export const API_URL = 'https://api.hashnhedge.com';

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
    cachedUser = null;
};

// Cache for user data fetched from backend
let cachedUser: User | null = null;

export const getCurrentUser = (): User | null => {
    // Check for cached user from fetchCurrentUser
    if (cachedUser) return cachedUser;

    // Check if token exists - if so, we're logged in but need to fetch user data
    const token = localStorage.getItem('hnh_token');
    if (!token) return null;

    // Return a placeholder that indicates we need to fetch real user data
    // Components should use fetchCurrentUser() for accurate data
    return null;
};

export const setCachedUser = (user: User | null) => {
    cachedUser = user;
};

// Async version - fetches real user data from backend
export const fetchCurrentUser = async (): Promise<User | null> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) {
        cachedUser = null;
        return null;
    }

    try {
        const res = await fetch(`${API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            cachedUser = user;
            return user;
        }
        // Token invalid, clear it
        localStorage.removeItem('hnh_token');
        cachedUser = null;
    } catch (e) {
        console.error('Failed to fetch user profile:', e);
    }
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
