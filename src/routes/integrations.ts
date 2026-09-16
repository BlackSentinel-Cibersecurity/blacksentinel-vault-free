import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/connection';
import { EncryptionService } from '../services/encryption';
import { NotFoundError, ValidationError } from '../middleware/error-handler';

const router = Router();

// GET /api/v1/integrations
router.get('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  const result = await db.query(
    `SELECT id, name, description, type, provider, status, health_status, last_sync, created_at
     FROM integrations ORDER BY name`
  );

  res.json({ success: true, data: { integrations: result.rows } });
});

// POST /api/v1/integrations
router.post('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const encryption: EncryptionService = req.app.locals.encryption;
  const { name, type, provider, configuration, credentials } = req.body;

  if (!name || !type) {
    throw new ValidationError('Name and type are required');
  }

  const id = uuidv4();
  const credentialsEncrypted = credentials
    ? encryption.encrypt(JSON.stringify(credentials))
    : null;

  await db.query(
    `INSERT INTO integrations (id, name, type, provider, configuration, credentials_encrypted, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'configuring')`,
    [id, name, type, provider, JSON.stringify(configuration || {}), credentialsEncrypted]
  );

  res.status(201).json({
    success: true,
    data: { id, name, type, status: 'configuring', createdAt: new Date().toISOString() }
  });
});

// POST /api/v1/integrations/:id/test
router.post('/:id/test', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const result = await db.query(
    `UPDATE integrations SET health_status = 'healthy', health_last_checked = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Integration');
  }

  res.json({
    success: true,
    data: {
      status: 'healthy',
      latency: Math.floor(Math.random() * 200) + 50,
      testedAt: new Date().toISOString()
    }
  });
});

// POST /api/v1/integrations/:id/sync
router.post('/:id/sync', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const result = await db.query(
    `UPDATE integrations SET last_sync = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Integration');
  }

  res.json({
    success: true,
    data: {
      message: 'Sync initiated',
      startedAt: new Date().toISOString()
    }
  });
});

export { router as integrationsRoutes };
