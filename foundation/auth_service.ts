/**
 * EZbill - Authentication & Role-Based Access Control (RBAC) Service
 * Team 1: Foundation, Auth & Database Architecture
 */

import { DatabaseManager } from './db';
import { User, UserRole, UserWithPassword } from './models';
import { hashPassword, verifyPassword, generateSessionToken, verifySessionToken } from './crypto_util';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  customerId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export class AuthService {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public register(
    organizationId: string,
    input: {
      email: string;
      password: string;
      name: string;
      role?: UserRole;
      customerId?: string;
    },
    actor: string = 'System'
  ): { user: AuthenticatedUser; token: string } {
    const { email, password, name, customerId } = input;
    const role: UserRole = input.role || 'customer';

    // 1. Validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('VALIDATION_ERROR: A valid email address is required.');
    }
    if (!password || password.length < 8) {
      throw new Error('VALIDATION_ERROR: Password must be at least 8 characters long.');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Full name is required.');
    }

    const validRoles: UserRole[] = ['admin', 'finance', 'sales', 'support', 'customer'];
    if (!validRoles.includes(role)) {
      throw new Error(`VALIDATION_ERROR: Invalid role. Allowed: ${validRoles.join(', ')}`);
    }

    // 2. Uniqueness check
    const existing = this.db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      throw new Error('CONFLICT: An account with this email address already exists.');
    }

    // 3. Hash password
    const { salt, hash } = hashPassword(password);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 4. Atomic transaction
    return this.db.transaction(() => {
      this.db.run(`
        INSERT INTO users (id, organization_id, email, password_hash, salt, name, role, is_active, customer_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
      `, [userId, organizationId, email.toLowerCase().trim(), hash, salt, name.trim(), role, customerId || null]);

      this.db.run(`
        INSERT INTO organization_memberships (id, organization_id, user_id, role, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [`mem-${userId}`, organizationId, userId, role]);

      // Audit trail
      this.db.run(`
        INSERT INTO audit_events (id, organization_id, timestamp, type, description, actor)
        VALUES (?, ?, datetime('now'), 'user_registered', ?, ?)
      `, [`act-${Date.now()}`, organizationId, `User ${email} registered with role '${role}'`, actor]);

      const user: AuthenticatedUser = {
        id: userId,
        organizationId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role,
        customerId: customerId || undefined,
      };

      const token = generateSessionToken({ userId, orgId: organizationId, role });
      return { user, token };
    });
  }

  public login(credentials: { email: string; password: string }): { user: AuthenticatedUser; token: string } {
    const { email, password } = credentials;
    if (!email || !password) {
      throw new Error('VALIDATION_ERROR: Email and password are required.');
    }

    const row = this.db.queryOne<any>(`
      SELECT id, organization_id, email, password_hash, salt, name, role, is_active, customer_id
      FROM users
      WHERE email = ?
    `, [email.toLowerCase().trim()]);

    if (!row) {
      throw new Error('AUTH_FAILED: Invalid email or password.');
    }

    if (!row.is_active) {
      throw new Error('AUTH_FORBIDDEN: User account is deactivated.');
    }

    const isValid = verifyPassword(password, row.salt, row.password_hash);
    if (!isValid) {
      throw new Error('AUTH_FAILED: Invalid email or password.');
    }

    const user: AuthenticatedUser = {
      id: row.id,
      organizationId: row.organization_id,
      email: row.email,
      name: row.name,
      role: row.role as UserRole,
      customerId: row.customer_id || undefined,
    };

    const token = generateSessionToken({ userId: user.id, orgId: user.organizationId, role: user.role });

    // Log login event
    this.db.run(`
      INSERT INTO audit_events (id, organization_id, timestamp, type, description, actor)
      VALUES (?, ?, datetime('now'), 'user_login', ?, ?)
    `, [`act-${Date.now()}`, user.organizationId, `User ${user.email} logged in successfully`, user.name]);

    return { user, token };
  }

  public verifyToken(token: string): AuthenticatedUser | null {
    const decoded = verifySessionToken(token);
    if (!decoded) return null;

    const row = this.db.queryOne<any>(`
      SELECT id, organization_id, email, name, role, is_active, customer_id
      FROM users
      WHERE id = ? AND is_active = 1
    `, [decoded.userId]);

    if (!row) return null;

    return {
      id: row.id,
      organizationId: row.organization_id,
      email: row.email,
      name: row.name,
      role: row.role as UserRole,
      customerId: row.customer_id || undefined,
    };
  }

  // Express middleware factory
  public authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = this.verifyToken(token);
      if (user) {
        req.user = user;
      }
    }
    next();
  };

  public requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid Bearer token.',
        },
      });
      return;
    }
    next();
  };

  public requireRoles = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
        return;
      }
      if (!roles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Requires one of roles: ${roles.join(', ')}. Current: '${req.user.role}'.`,
          },
        });
        return;
      }
      next();
    };
  };

  public requireOrgAccess = (getOrgId: (req: Request) => string | undefined) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const targetOrg = getOrgId(req);
      if (targetOrg && targetOrg !== req.user.organizationId) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cross-organization access violation.' },
        });
        return;
      }
      next();
    };
  };
}
