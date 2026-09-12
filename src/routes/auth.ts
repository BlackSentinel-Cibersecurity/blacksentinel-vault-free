import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/connection';
import { AuditService } from '../services/audit';
import { UnauthorizedError, ValidationError } from '../middleware/error-handler';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const audit: AuditService = req.app.locals.audit;
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const result = await db.query(
    `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );

  if (result.rows.length === 0) {
    await audit.log({
      eventType: 'login_failed',
      action: 'login',
      status: 'failure',
      severity: 'medium',
      details: { email, reason: 'User not found' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    throw new UnauthorizedError('Invalid credentials');
  }

  const user = result.rows[0];

  if (user.status !== 'active') {
    throw new UnauthorizedError('Account is not active');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new UnauthorizedError('Account is locked');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    await db.query(
      `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1`,
      [user.id]
    );

    if (user.failed_login_attempts >= 4) {
      await db.query(
        `UPDATE users SET locked_until = NOW() + INTERVAL '30 minutes' WHERE id = $1`,
        [user.id]
      );
    }

    await audit.log({
      eventType: 'login_failed',
      action: 'login',
      status: 'failure',
      severity: 'medium',
      actorId: user.id,
      actorName: `${user.first_name} ${user.last_name}`,
      details: { reason: 'Invalid password' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    throw new UnauthorizedError('Invalid credentials');
  }

  // Get user roles and permissions
  const rolesResult = await db.query(
    `SELECT r.name, r.permissions FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [user.id]
  );

  const roles = rolesResult.rows.map(r => r.name);
  const permissions = rolesResult.rows.flatMap(r => r.permissions || []);

  // Create session
  const sessionId = uuidv4();
  const tokenPayload = {
    id: user.id,
    email: user.email,
    roles,
    permissions,
    sessionId,
    mfaVerified: !user.mfa_enabled
  };

  const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRATION as string || '1h'
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(
    { id: user.id, sessionId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION as string || '7d' } as jwt.SignOptions
  );

  // Save session
  await db.query(
    `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, mfa_verified, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days')`,
    [sessionId, user.id, bcrypt.hashSync(accessToken, 10), req.ip, req.get('user-agent'), !user.mfa_enabled]
  );

  // Update last login
  await db.query(
    `UPDATE users SET last_login = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [user.id]
  );

  await audit.log({
    eventType: 'login',
    action: 'login',
    status: 'success',
    actorId: user.id,
    actorName: `${user.first_name} ${user.last_name}`,
    details: { method: 'password' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    sessionId
  });

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '3600'),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
        mfaEnabled: user.mfa_enabled
      }
    }
  });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;

    const session = await db.query(
      `SELECT * FROM user_sessions WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [decoded.sessionId, decoded.id]
    );

    if (session.rows.length === 0) {
      throw new UnauthorizedError('Invalid session');
    }

    const user = await db.query(
      `SELECT * FROM users WHERE id = $1 AND status = 'active'`,
      [decoded.id]
    );

    if (user.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const userData = user.rows[0];

    const rolesResult = await db.query(
      `SELECT r.name, r.permissions FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userData.id]
    );

    const roles = rolesResult.rows.map(r => r.name);
    const permissions = rolesResult.rows.flatMap(r => r.permissions || []);

    const newAccessToken = jwt.sign(
      {
        id: userData.id,
        email: userData.email,
        roles,
        permissions,
        sessionId: decoded.sessionId,
        mfaVerified: true
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRATION as string || '1h' } as jwt.SignOptions
    );

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: parseInt(process.env.JWT_EXPIRATION || '3600'),
        tokenType: 'Bearer'
      }
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  if (req.user?.sessionId) {
    await db.query(
      `UPDATE user_sessions SET is_active = false WHERE id = $1`,
      [req.user.sessionId]
    );
  }

  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

// GET /api/v1/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  const user = await db.query(
    `SELECT id, email, first_name, last_name, status, mfa_enabled, last_login, created_at
     FROM users WHERE id = $1`,
    [req.user?.id]
  );

  if (user.rows.length === 0) {
    throw new UnauthorizedError('User not found');
  }

  res.json({ success: true, data: user.rows[0] });
});

export { router as authRoutes };
