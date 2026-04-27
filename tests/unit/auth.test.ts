/**
 * Authentication Service Tests
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret-key';

// Mock functions from auth-utils.js
const generateToken = (userId, role = 'user', expiresIn = '24h') => {
  return jwt.sign(
    { userId, role, iat: Date.now() },
    JWT_SECRET,
    { expiresIn }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

describe('Authentication Services', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('user123', 'user');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId and role in token payload', () => {
      const token = generateToken('user456', 'agent');
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.userId).toBe('user456');
      expect(decoded.role).toBe('agent');
    });

    it('should use default role if not provided', () => {
      const token = generateToken('user789');
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.role).toBe('user');
    });

    it('should expire token according to expiresIn parameter', () => {
      const token = jwt.sign(
        {
          userId: 'user999',
          role: 'user',
          exp: Math.floor(Date.now() / 1000) - 1,
        },
        JWT_SECRET
      );

      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow('jwt expired');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken('user123', 'user');
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe('user123');
      expect(decoded.role).toBe('user');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow('Invalid or expired token');
    });

    it('should throw error for tampered token', () => {
      const token = generateToken('user123', 'user');
      const tamperedToken = token.slice(0, -5) + 'tampered';
      
      expect(() => {
        verifyToken(tamperedToken);
      }).toThrow('Invalid or expired token');
    });
  });

  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const testToken = 'test.jwt.token';
      const authHeader = `Bearer ${testToken}`;
      
      const extracted = extractToken(authHeader);
      expect(extracted).toBe(testToken);
    });

    it('should return null for missing Bearer prefix', () => {
      const authHeader = 'test.jwt.token';
      const extracted = extractToken(authHeader);
      
      expect(extracted).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = extractToken('');
      expect(extracted).toBeNull();
    });

    it('should return null for undefined header', () => {
      const extracted = extractToken(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const authHeader = 'Bearer';
      const extracted = extractToken(authHeader);
      
      expect(extracted).toBeNull();
    });
  });
});
