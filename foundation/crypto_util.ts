/**
 * EZbill - Cryptographic Utilities
 * Team 1: Foundation, Auth & Database Architecture
 *
 * Uses Node.js built-in `node:crypto` for robust PBKDF2 password hashing,
 * cryptographically secure salt generation, and tamper-proof session tokens.
 */

import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 10000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

export interface HashResult {
  salt: string;
  hash: string;
}

/**
 * Hash a password using PBKDF2 with a secure random salt
 */
export function hashPassword(password: string, providedSalt?: string): HashResult {
  const salt = providedSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  ).toString('hex');

  return { salt, hash };
}

/**
 * Verify a plain text password against a stored salt and hash
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Generate a cryptographically secure signed session token
 */
export function generateSessionToken(payload: { userId: string; orgId: string; role: string }): string {
  const secret = process.env.JWT_SECRET || 'ezbill-foundation-secret-key-2026';
  const data = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(token: string): { userId: string; orgId: string; role: string; exp: number } | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const secret = process.env.JWT_SECRET || 'ezbill-foundation-secret-key-2026';
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');

    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (decoded.exp && Date.now() > decoded.exp) {
      return null; // Expired
    }

    return decoded;
  } catch {
    return null;
  }
}
