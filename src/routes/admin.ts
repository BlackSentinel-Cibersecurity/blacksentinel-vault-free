import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { Database } from '../database/connection';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../middleware/error-handler';
import { editionConfig } from '../config/edition';

const router = Router();

// GET /api/v1/admin/users
router.get('/users', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  const result = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.mfa_enabled,
     u.last_login, u.created_at,
     ARRAY_AGG(r.name) as roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.deleted_at IS NULL
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );

  res.json({ success: true, data: { users: result.rows } });
});

// POST /api/v1/admin/users
router.post('/users', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { email, password, firstName, lastName, roles } = req.body;

  if (!email || !password || !firstName || !lastName) {
    throw new ValidationError('Email, password, first name, and last name are required');
  }

  const existing = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rows.length > 0) {
    throw new ConflictError('User with this email already exists');
  }

  if (editionConfig.limits.maxUsers !== Infinity) {
    const countResult = await db.query(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`);
    const currentCount = parseInt(countResult.rows[0].count, 10);
    if (currentCount >= editionConfig.limits.maxUsers) {
      throw new ForbiddenError(
        `Free plan is limited to ${editionConfig.limits.maxUsers} users. Upgrade to add more.`,
      );
    }
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  await db.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, email, passwordHash, firstName, lastName]
  );

  // Assign roles
  if (roles?.length) {
    for (const roleName of roles) {
      const role = await db.query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
      if (role.rows.length > 0) {
        await db.query(
          `INSERT INTO user_roles (user_id, role_id, granted_by) VALUES ($1, $2, $3)`,
          [id, role.rows[0].id, req.user?.id]
        );
      }
    }
  }

  res.status(201).json({
    success: true,
    data: { id, email, firstName, lastName, createdAt: new Date().toISOString() }
  });
});

// PUT /api/v1/admin/users/:id
router.put('/users/:id', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;
  const { firstName, lastName, status, roles } = req.body;

  const result = await db.query(
    `UPDATE users SET
     first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
     status = COALESCE($3, status), updated_at = NOW()
     WHERE id = $4 AND deleted_at IS NULL RETURNING id`,
    [firstName, lastName, status, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User');
  }

  // Update roles if provided
  if (roles) {
    await db.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
    for (const roleName of roles) {
      const role = await db.query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
      if (role.rows.length > 0) {
        await db.query(
          `INSERT INTO user_roles (user_id, role_id, granted_by) VALUES ($1, $2, $3)`,
          [id, role.rows[0].id, req.user?.id]
        );
      }
    }
  }

  res.json({ success: true, data: { message: 'User updated successfully' } });
});

// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const result = await db.query(
    `UPDATE users SET deleted_at = NOW(), status = 'deleted' WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User');
  }

  res.json({ success: true, data: { message: 'User deleted successfully' } });
});

// GET /api/v1/admin/roles
router.get('/roles', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  const result = await db.query(
    `SELECT r.*, COUNT(ur.id) as user_count
     FROM roles r
     LEFT JOIN user_roles ur ON r.id = ur.role_id
     GROUP BY r.id
     ORDER BY r.name`
  );

  res.json({ success: true, data: { roles: result.rows } });
});

export { router as adminRoutes };
