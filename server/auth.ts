import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb, saveDb, User, AuditLog } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'saylani-hcm-lite-hackathon-2026-secret-key-xyz';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      employeeId: user.employeeId,
      mustChangePassword: user.mustChangePassword,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No Bearer token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const db = getDb();
    const user = db.users.find((u) => u.id === decoded.id && u.isActive);

    if (!user) {
      res.status(401).json({ error: 'User session invalid or user deactivated.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles: Array<'admin' | 'hr' | 'employee'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
      });
      return;
    }

    next();
  };
}

export function audit(
  actor: User | { id: string; email: string; role: string },
  action: string,
  entity: string,
  entityId?: string,
  beforeData?: any,
  afterData?: any
): void {
  const db = getDb();
  const log: AuditLog = {
    id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    entity,
    entityId,
    beforeData: beforeData ? JSON.parse(JSON.stringify(beforeData)) : null,
    afterData: afterData ? JSON.parse(JSON.stringify(afterData)) : null,
    timestamp: new Date().toISOString(),
  };

  db.auditLogs.unshift(log);
  // Keep last 1000 audit logs
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  saveDb();
}
