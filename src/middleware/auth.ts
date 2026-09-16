import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './error-handler';

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  mfaVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthUser;
    req.user = decoded;
    next();
  } catch (_error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    const hasRole = roles.some(role => req.user!.roles.includes(role));
    if (!hasRole) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
};

export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    const hasPermission = permissions.every(p =>
      req.user!.permissions.includes(p) || req.user!.permissions.includes('*')
    );
    if (!hasPermission) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
};

export const requireMFA = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.mfaVerified) {
    return next(new ForbiddenError('MFA verification required'));
  }
  next();
};
