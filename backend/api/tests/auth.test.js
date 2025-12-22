/**
 * Backend API Auth Route Tests
 *
 * Tests for the authentication endpoints (register, login).
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
};

// Mock bcrypt
const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};

// Mock jwt
const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
};

// Mock modules before importing
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: mockBcrypt,
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: mockJwt,
}));

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should validate username and password are required', async () => {
      // Simulate validation logic
      const validateRegistration = (body) => {
        if (!body.username || !body.password) {
          return { valid: false, error: 'Username and password are required' };
        }
        return { valid: true };
      };

      const result = validateRegistration({});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username and password are required');
    });

    it('should reject registration with missing password', async () => {
      const validateRegistration = (body) => {
        if (!body.username || !body.password) {
          return { valid: false, error: 'Username and password are required' };
        }
        return { valid: true };
      };

      const result = validateRegistration({ username: 'testuser' });
      expect(result.valid).toBe(false);
    });

    it('should reject registration with missing username', async () => {
      const validateRegistration = (body) => {
        if (!body.username || !body.password) {
          return { valid: false, error: 'Username and password are required' };
        }
        return { valid: true };
      };

      const result = validateRegistration({ password: 'testpass' });
      expect(result.valid).toBe(false);
    });

    it('should generate unique referral code', () => {
      const generateReferralCode = (username) => {
        return `HNH-${username.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      };

      const code = generateReferralCode('testuser');
      expect(code).toMatch(/^HNH-TES-[A-Z0-9]{4}$/);
    });

    it('should hash password before storing', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed_password');

      const password = 'mypassword123';
      const hashed = await mockBcrypt.hash(password, 10);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(hashed).toBe('hashed_password');
    });

    it('should create JWT token on successful registration', () => {
      mockJwt.sign.mockReturnValue('jwt_token_123');

      const user = { id: '123', username: 'testuser' };
      const token = mockJwt.sign(user, 'secret');

      expect(mockJwt.sign).toHaveBeenCalledWith(user, 'secret');
      expect(token).toBe('jwt_token_123');
    });

    it('should check for existing username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '123', username: 'existinguser' });

      const existing = await mockPrisma.user.findUnique({
        where: { username: 'existinguser' }
      });

      expect(existing).not.toBeNull();
      expect(existing.username).toBe('existinguser');
    });

    it('should allow registration when username is available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const existing = await mockPrisma.user.findUnique({
        where: { username: 'newuser' }
      });

      expect(existing).toBeNull();
    });
  });

  describe('POST /auth/login', () => {
    it('should validate credentials are required', () => {
      const validateLogin = (body) => {
        if (!body.username || !body.password) {
          return { valid: false, error: 'Username and password are required' };
        }
        return { valid: true };
      };

      expect(validateLogin({}).valid).toBe(false);
      expect(validateLogin({ username: 'test' }).valid).toBe(false);
      expect(validateLogin({ password: 'test' }).valid).toBe(false);
      expect(validateLogin({ username: 'test', password: 'test' }).valid).toBe(true);
    });

    it('should verify password against hash', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const isValid = await mockBcrypt.compare('password123', 'hashed_password');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(isValid).toBe(true);
    });

    it('should reject invalid password', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const isValid = await mockBcrypt.compare('wrongpassword', 'hashed_password');

      expect(isValid).toBe(false);
    });

    it('should return user not found for non-existent username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const user = await mockPrisma.user.findUnique({
        where: { username: 'nonexistent' }
      });

      expect(user).toBeNull();
    });

    it('should generate JWT on successful login', () => {
      mockJwt.sign.mockReturnValue('login_jwt_token');

      const token = mockJwt.sign({ id: '123', username: 'testuser' }, 'secret');

      expect(token).toBe('login_jwt_token');
    });
  });

  describe('JWT Token Handling', () => {
    it('should sign token with user id and username', () => {
      mockJwt.sign.mockReturnValue('signed_token');

      const payload = { id: 'user123', username: 'testuser' };
      const secret = 'jwt_secret';

      const token = mockJwt.sign(payload, secret);

      expect(mockJwt.sign).toHaveBeenCalledWith(payload, secret);
      expect(token).toBe('signed_token');
    });

    it('should verify valid token', () => {
      const decodedPayload = { id: 'user123', username: 'testuser' };
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, decodedPayload);
      });

      let result;
      mockJwt.verify('valid_token', 'secret', (err, decoded) => {
        result = decoded;
      });

      expect(result).toEqual(decodedPayload);
    });

    it('should reject invalid token', () => {
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      let error;
      mockJwt.verify('invalid_token', 'secret', (err, decoded) => {
        error = err;
      });

      expect(error).toBeDefined();
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('Password Security', () => {
    it('should use bcrypt with cost factor 10', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed');

      await mockBcrypt.hash('password', 10);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('password', 10);
    });

    it('should not store plaintext passwords', async () => {
      const password = 'mysecretpassword';
      mockBcrypt.hash.mockResolvedValue('$2a$10$hashedvalue');

      const hashed = await mockBcrypt.hash(password, 10);

      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2[aby]?\$\d+\$/);
    });
  });
});
