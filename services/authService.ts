
import { User, UserCredentials } from '../types';

// Railway backend URL - uses VITE_API_URL in production, localhost for dev
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const registerUser = async (creds: UserCredentials): Promise<{ user: User | null; error: string | null }> => {
    try {
        console.log(`[Auth] Attempting registration to: ${API_URL}/auth/register`);
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        if (!res.ok) {
            let errorText = '';
            try {
                const errorData = await res.json();
                errorText = errorData.error || `HTTP ${res.status}`;
            } catch {
                errorText = await res.text() || `HTTP ${res.status}`;
            }
            console.error(`[Auth] Registration failed with status ${res.status}:`, errorText);
            return { user: null, error: errorText };
        }

        const data = await res.json();
        localStorage.setItem('hnh_token', data.token); // Store JWT
        console.log('[Auth] Registration successful');
        return { user: data.user, error: null };
    } catch (e) {
        console.error("[Auth] Registration error:", e);
        let errorMessage = 'Registration failed';
        if (e instanceof TypeError && e.message.includes('fetch')) {
            errorMessage = `Cannot connect to backend at ${API_URL}. Please check your network connection and ensure VITE_API_URL is set correctly.`;
            console.error(`[Auth] Network error - is the backend running at ${API_URL}?`);
        } else if (e instanceof Error) {
            errorMessage = e.message;
        }
        return { user: null, error: errorMessage };
    }
};

export const loginUser = async (creds: UserCredentials): Promise<{ user: User | null; error: string | null }> => {
    try {
        console.log(`[Auth] Attempting login to: ${API_URL}/auth/login`);
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        if (!res.ok) {
            let errorText = '';
            try {
                const errorData = await res.json();
                errorText = errorData.error || `HTTP ${res.status}`;
            } catch {
                errorText = await res.text() || `HTTP ${res.status}`;
            }
            console.error(`[Auth] Login failed with status ${res.status}:`, errorText);
            return { user: null, error: errorText };
        }

        const data = await res.json();
        localStorage.setItem('hnh_token', data.token);
        console.log('[Auth] Login successful');
        return { user: data.user, error: null };
    } catch (e) {
        console.error("[Auth] Login error:", e);
        let errorMessage = 'Login failed';
        if (e instanceof TypeError && e.message.includes('fetch')) {
            errorMessage = `Cannot connect to backend at ${API_URL}. Please check your network connection and ensure VITE_API_URL is set correctly.`;
            console.error(`[Auth] Network error - is the backend running at ${API_URL}?`);
        } else if (e instanceof Error) {
            errorMessage = e.message;
        }
        return { user: null, error: errorMessage };
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
