/**
 * Auth Service Tests
 *
 * Tests for the authentication service that handles user login, registration, and session management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUser, loginUser, logoutUser, getCurrentUser, fetchCurrentUser, API_URL } from '../../services/authService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      const mockUser = { id: '123', username: 'testuser', tier: 'free', role: 'user' };
      const mockToken = 'jwt-token-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, user: mockUser }),
      });

      const result = await registerUser({ username: 'testuser', password: 'password123' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/auth/register`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
        })
      );
      expect(result).toEqual(mockUser);
      expect(localStorage.getItem('hnh_token')).toBe(mockToken);
    });

    it('should throw error when username is taken', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => JSON.stringify({ error: 'Username taken' }),
      });

      await expect(registerUser({ username: 'existinguser', password: 'pass' }))
        .rejects.toThrow('Username taken');
    });

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(registerUser({ username: 'testuser', password: 'pass' }))
        .rejects.toThrow('Network error');
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Server error',
      });

      await expect(registerUser({ username: 'testuser', password: 'pass' }))
        .rejects.toThrow('Server error');
    });
  });

  describe('loginUser', () => {
    it('should successfully log in a user', async () => {
      const mockUser = { id: '123', username: 'testuser', tier: 'pro', role: 'user' };
      const mockToken = 'jwt-token-456';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, user: mockUser }),
      });

      const result = await loginUser({ username: 'testuser', password: 'password123' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
        })
      );
      expect(result).toEqual(mockUser);
      expect(localStorage.getItem('hnh_token')).toBe(mockToken);
    });

    it('should throw error for invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => JSON.stringify({ error: 'Invalid password' }),
      });

      await expect(loginUser({ username: 'testuser', password: 'wrongpass' }))
        .rejects.toThrow('Invalid password');
    });

    it('should throw error when user not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => JSON.stringify({ error: 'User not found' }),
      });

      await expect(loginUser({ username: 'nonexistent', password: 'pass' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('logoutUser', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('hnh_token', 'some-token');

      logoutUser();

      expect(localStorage.getItem('hnh_token')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no token exists', () => {
      const user = getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return minimal user object when token exists', () => {
      localStorage.setItem('hnh_token', 'some-token');

      const user = getCurrentUser();

      expect(user).toEqual({
        id: 'session',
        username: 'User',
        tier: 'free',
        createdAt: 0,
        passwordHash: '',
        referralCode: '',
        referralBonus: 0,
      });
    });
  });

  describe('fetchCurrentUser', () => {
    it('should return null when no token exists', async () => {
      const user = await fetchCurrentUser();
      expect(user).toBeNull();
    });

    it('should fetch and return user profile when token exists', async () => {
      const mockUser = { id: '123', username: 'testuser', tier: 'pro' };
      localStorage.setItem('hnh_token', 'valid-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const user = await fetchCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/user/profile`,
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer valid-token' },
        })
      );
      expect(user).toEqual(mockUser);
    });

    it('should return null on API error', async () => {
      localStorage.setItem('hnh_token', 'invalid-token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const user = await fetchCurrentUser();
      expect(user).toBeNull();
    });

    it('should return null on network error', async () => {
      localStorage.setItem('hnh_token', 'valid-token');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const user = await fetchCurrentUser();
      expect(user).toBeNull();
    });
  });
});
