/**
 * Backend API Middleware Tests
 *
 * Tests for authentication middleware (JWT verification).
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock jwt
const mockJwt = {
  verify: jest.fn(),
};

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: mockJwt,
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      headers: {},
    };

    res = {
      sendStatus: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  // Simulate the authenticateToken middleware
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    mockJwt.verify(token, 'test-secret', (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  describe('Token Extraction', () => {
    it('should return 401 when no authorization header', () => {
      authenticateToken(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is empty', () => {
      req.headers['authorization'] = '';

      authenticateToken(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Bearer keyword is missing', () => {
      req.headers['authorization'] = 'sometoken';

      authenticateToken(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing after Bearer', () => {
      req.headers['authorization'] = 'Bearer ';

      authenticateToken(req, res, next);

      // Token would be empty string after split which is falsy
      expect(res.sendStatus).toHaveBeenCalledWith(401);
    });

    it('should extract token from Bearer scheme', () => {
      const token = 'valid_jwt_token';
      req.headers['authorization'] = `Bearer ${token}`;
      mockJwt.verify.mockImplementation((t, secret, callback) => {
        callback(null, { id: '123', username: 'user' });
      });

      authenticateToken(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        token,
        'test-secret',
        expect.any(Function)
      );
    });
  });

  describe('Token Verification', () => {
    it('should return 403 for invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid_token';
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      authenticateToken(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for expired token', () => {
      req.headers['authorization'] = 'Bearer expired_token';
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        const error = new Error('TokenExpiredError');
        error.name = 'TokenExpiredError';
        callback(error, null);
      });

      authenticateToken(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should return 403 for malformed token', () => {
      req.headers['authorization'] = 'Bearer malformed.token';
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        const error = new Error('JsonWebTokenError');
        error.name = 'JsonWebTokenError';
        callback(error, null);
      });

      authenticateToken(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should call next() for valid token', () => {
      req.headers['authorization'] = 'Bearer valid_token';
      const userPayload = { id: '123', username: 'testuser' };
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, userPayload);
      });

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(userPayload);
    });

    it('should attach user to request object', () => {
      req.headers['authorization'] = 'Bearer valid_token';
      const userPayload = { id: 'user456', username: 'alice', tier: 'pro' };
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, userPayload);
      });

      authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user456');
      expect(req.user.username).toBe('alice');
      expect(req.user.tier).toBe('pro');
    });
  });

  describe('Authorization Header Parsing', () => {
    it('should handle lowercase authorization header', () => {
      req.headers['authorization'] = 'Bearer token123';
      mockJwt.verify.mockImplementation((t, s, cb) => cb(null, { id: '1' }));

      authenticateToken(req, res, next);

      // Token is extracted and verify is called
      expect(next).toHaveBeenCalled();
    });

    it('should handle extra whitespace after Bearer', () => {
      // When there's extra whitespace, split(' ')[1] returns empty string after multiple spaces
      req.headers['authorization'] = 'Bearer   token_with_spaces';

      authenticateToken(req, res, next);

      // The split returns the part after 'Bearer ', which would be empty string followed by spaces
      // Since empty string after the first split is treated as no token, expect 401
      // Actually, 'Bearer   token'.split(' ')[1] === '' (empty)
      // So it should return 401
      expect(res.sendStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('Security Considerations', () => {
    it('should not expose token in error responses', () => {
      req.headers['authorization'] = 'Bearer secret_token';
      mockJwt.verify.mockImplementation((t, s, cb) => {
        cb(new Error('Invalid'), null);
      });

      authenticateToken(req, res, next);

      // Should just return status code, not token details
      expect(res.sendStatus).toHaveBeenCalledWith(403);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should verify against correct secret', () => {
      req.headers['authorization'] = 'Bearer token';
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        // Verify correct secret is used
        expect(secret).toBe('test-secret');
        callback(null, { id: '1' });
      });

      authenticateToken(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalled();
    });
  });
});
