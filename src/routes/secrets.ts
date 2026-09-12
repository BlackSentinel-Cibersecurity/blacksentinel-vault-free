import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/connection';
import { EncryptionService } from '../services/encryption';
import { AuditService } from '../services/audit';
import { NotFoundError, ValidationError, ForbiddenError } from '../middleware/error-handler';
import { editionConfig } from '../config/edition';

const router = Router();

// GET /api/v1/secrets
router.get('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { page = 1, limit = 20, type, status, search, folder } = req.query;

  let query = 'SELECT id, name, description, type, status, tags, folder_id, expires_at, last_rotated_at, access_count, created_at FROM secrets WHERE deleted_at IS NULL';
  const values: any[] = [];
  let paramIndex = 1;

  if (type) {
    query += ` AND type = $${paramIndex}`;
    values.push(type);
    paramIndex++;
  }

  if (status) {
    query += ` AND status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (folder) {
    query += ` AND folder_id = $${paramIndex}`;
    values.push(folder);
    paramIndex++;
  }

  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  const countResult = await db.query(query.replace('SELECT id, name, description, type, status, tags, folder_id, expires_at, last_rotated_at, access_count, created_at', 'SELECT COUNT(*)'), values);
  const total = parseInt(countResult.rows[0].count);

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(parseInt(limit as string), (parseInt(page as string) - 1) * parseInt(limit as string));

  const result = await db.query(query, values);

  res.json({
    success: true,
    data: {
      secrets: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    }
  });
});

// POST /api/v1/secrets
router.post('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const encryption: EncryptionService = req.app.locals.encryption;
  const audit: AuditService = req.app.locals.audit;
  const { name, type, value, description, tags, folder_id, expires_at, rotation_policy } = req.body;

  if (!name || !type || !value) {
    throw new ValidationError('Name, type, and value are required');
  }

  if (editionConfig.limits.maxSecrets !== Infinity) {
    const countResult = await db.query(`SELECT COUNT(*) FROM secrets WHERE deleted_at IS NULL`);
    const currentCount = parseInt(countResult.rows[0].count, 10);
    if (currentCount >= editionConfig.limits.maxSecrets) {
      throw new ForbiddenError(
        `Free plan is limited to ${editionConfig.limits.maxSecrets} secrets. Upgrade to add more.`,
      );
    }
  }

  const id = uuidv4();
  const encryptedValue = encryption.encrypt(value);

  await db.query(
    `INSERT INTO secrets (id, name, description, type, value_encrypted, tags, folder_id, expires_at, rotation_policy, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, name, description, type, encryptedValue, tags || [], folder_id, expires_at, JSON.stringify(rotation_policy || {}), req.user?.id]
  );

  await audit.log({
    eventType: 'secret_created',
    action: 'create',
    status: 'success',
    actorId: req.user?.id,
    resourceType: 'secret',
    resourceId: id,
    resourceName: name,
    details: { type },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    data: { id, name, type, description, tags, created_at: new Date().toISOString() }
  });
});

// GET /api/v1/secrets/:id
router.get('/:id', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const result = await db.query(
    `SELECT id, name, description, type, status, tags, folder_id, expires_at, last_rotated_at, access_count, created_at, updated_at
     FROM secrets WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Secret');
  }

  res.json({ success: true, data: result.rows[0] });
});

// PUT /api/v1/secrets/:id
router.put('/:id', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;
  const { name, description, tags, folder_id, expires_at } = req.body;

  const result = await db.query(
    `UPDATE secrets SET name = COALESCE($1, name), description = COALESCE($2, description),
     tags = COALESCE($3, tags), folder_id = COALESCE($4, folder_id),
     expires_at = COALESCE($5, expires_at), updated_at = NOW()
     WHERE id = $6 AND deleted_at IS NULL RETURNING id`,
    [name, description, tags, folder_id, expires_at, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Secret');
  }

  res.json({ success: true, data: { message: 'Secret updated successfully' } });
});

// DELETE /api/v1/secrets/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const result = await db.query(
    `UPDATE secrets SET deleted_at = NOW(), status = 'revoked' WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Secret');
  }

  res.json({ success: true, data: { message: 'Secret deleted successfully' } });
});

// POST /api/v1/secrets/:id/rotate
router.post('/:id/rotate', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const encryption: EncryptionService = req.app.locals.encryption;
  const audit: AuditService = req.app.locals.audit;
  const { id } = req.params;

  const secret = await db.query(
    `SELECT * FROM secrets WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  if (secret.rows.length === 0) {
    throw new NotFoundError('Secret');
  }

  const secretData = secret.rows[0];
  const newValue = encryption.generatePassword(32);
  const encryptedValue = encryption.encrypt(newValue);

  // Save version
  await db.query(
    `INSERT INTO secret_versions (secret_id, version, value_encrypted, checksum, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, secretData.value_version + 1, encryptedValue, encryption.hash(newValue), req.user?.id]
  );

  // Update secret
  await db.query(
    `UPDATE secrets SET value_encrypted = $1, value_version = value_version + 1,
     last_rotated_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [encryptedValue, id]
  );

  await audit.log({
    eventType: 'secret_rotated',
    action: 'rotate',
    status: 'success',
    actorId: req.user?.id,
    resourceType: 'secret',
    resourceId: id,
    resourceName: secretData.name,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    data: {
      message: 'Secret rotated successfully',
      version: secretData.value_version + 1,
      rotatedAt: new Date().toISOString()
    }
  });
});

// GET /api/v1/secrets/:id/versions
router.get('/:id/versions', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const result = await db.query(
    `SELECT id, version, created_by, created_at FROM secret_versions
     WHERE secret_id = $1 ORDER BY version DESC`,
    [id]
  );

  res.json({ success: true, data: { versions: result.rows } });
});

// GET /api/v1/secrets/expiring/list
router.get('/expiring/list', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { days = 30 } = req.query;

  const result = await db.query(
    `SELECT id, name, type, expires_at FROM secrets
     WHERE expires_at IS NOT NULL
     AND expires_at < NOW() + ($1 || ' days')::INTERVAL
     AND expires_at > NOW()
     AND deleted_at IS NULL
     ORDER BY expires_at ASC`,
    [days]
  );

  res.json({ success: true, data: { secrets: result.rows } });
});

export { router as secretsRoutes };
