
import { User, UserCredentials } from '../types';

const STORAGE_KEY_USERS = 'hnh_users';
const STORAGE_KEY_SESSION = 'hnh_session';

// Simple hash (for demo privacy, not strong security)
const hashPassword = async (pwd: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const registerUser = async (creds: UserCredentials): Promise<User | null> => {
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (users.find(u => u.username === creds.username)) {
        return null; // Already exists
    }

    // Generate unique referral code
    const referralCode = `HNH-${creds.username.toUpperCase().substring(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Find referrer if code provided
    let referredBy: string | undefined;
    if (creds.referralCode) {
        const referrer = users.find(u => u.referralCode === creds.referralCode);
        if (referrer) {
            referredBy = creds.referralCode;
        }
    }

    const newUser: User = {
        id: crypto.randomUUID(),
        username: creds.username,
        passwordHash: await hashPassword(creds.password),
        createdAt: Date.now(),
        tier: 'free',
        referralCode,
        referredBy,
        referralBonus: 0
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    // Auto-login the new user
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newUser));
    return newUser;
};

export const loginUser = async (creds: UserCredentials): Promise<User | null> => {
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    const hash = await hashPassword(creds.password);
    const user = users.find(u => u.username === creds.username && u.passwordHash === hash);

    if (user) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
        return user;
    }
    return null;
};

export const logoutUser = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
};

export const getCurrentUser = (): User | null => {
    const sessionStr = localStorage.getItem(STORAGE_KEY_SESSION);
    return sessionStr ? JSON.parse(sessionStr) : null;
};

// Update user tier
export const updateUserTier = (userId: string, newTier: User['tier']): boolean => {
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;

    users[userIndex].tier = newTier;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    // Update session if current user
    const session = getCurrentUser();
    if (session?.id === userId) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(users[userIndex]));
    }
    return true;
};

// Add referral bonus to a user
export const addReferralBonus = (referralCode: string, bonusAmount: number): void => {
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    const referrer = users.find(u => u.referralCode === referralCode);
    if (referrer) {
        referrer.referralBonus += bonusAmount;
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }
};

// Get all users referred by a specific code
export const getReferrals = (referralCode: string): User[] => {
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    return users.filter(u => u.referredBy === referralCode);
};
