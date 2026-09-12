import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/connection';
import { AuditService } from '../services/audit';
import { NotFoundError, ValidationError } from '../middleware/error-handler';

const router = Router();

// GET /api/v1/certificates
router.get('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { page = 1, limit = 20, type, status, expiring } = req.query;

  let query = 'SELECT id, name, common_name, type, source, status, sans, not_before, not_after, auto_renew, created_at FROM certificates WHERE 1=1';
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

  if (expiring) {
    query += ` AND not_after < NOW() + ($1 || ' days')::INTERVAL AND not_after > NOW()`;
    values.push(parseInt(expiring as string));
    paramIndex++;
  }

  const countResult = await db.query(query.replace(/SELECT .+? FROM/, 'SELECT COUNT(*) FROM'), values);
  const total = parseInt(countResult.rows[0].count);

  query += ` ORDER BY not_after ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(parseInt(limit as string), (parseInt(page as string) - 1) * parseInt(limit as string));

  const result = await db.query(query, values);

  res.json({
    success: true,
    data: {
      certificates: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    }
  });
});

// POST /api/v1/certificates
router.post('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const audit: AuditService = req.app.locals.audit;
  const { name, common_name, organization, organization_unit, type, source, sans, validity_days, auto_renew } = req.body;

  if (!name || !common_name || !type) {
    throw new ValidationError('Name, common name, and type are required');
  }

  const id = uuidv4();
  const serialNumber = uuidv4().replace(/-/g, '');
  const notBefore = new Date();
  const notAfter = new Date(notBefore.getTime() + (validity_days || 365) * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO certificates (id, name, common_name, organization, organization_unit, serial_number, type, source,
     status, subject, issuer, sans, not_before, not_after, auto_renew, renewal_days_before, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      id, name, common_name, organization, organization_unit, serialNumber, type, source || 'internal',
      'active',
      JSON.stringify({ commonName: common_name, organization, organizationUnit: organization_unit }),
      JSON.stringify({ commonName: 'BlackSentinel CA', organization: 'BlackSentinel' }),
      sans || [],
      notBefore, notAfter,
      auto_renew !== false, 30,
      []
    ]
  );

  await audit.log({
    eventType: 'certificate_requested',
    action: 'create',
    status: 'success',
    actorId: req.user?.id,
    resourceType: 'certificate',
    resourceId: id,
    resourceName: name,
    details: { commonName: common_name, type },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    data: {
      id,
      name,
      commonName: common_name,
      serialNumber,
      notBefore: notBefore.toISOString(),
      notAfter: notAfter.toISOString(),
      createdAt: new Date().toISOString()
    }
  });
});

// GET /api/v1/certificates/:id
router.get('/:id', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const result = await db.query(
    `SELECT * FROM certificates WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Certificate');
  }

  res.json({ success: true, data: result.rows[0] });
});

// POST /api/v1/certificates/:id/renew
router.post('/:id/renew', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const cert = await db.query(
    `SELECT * FROM certificates WHERE id = $1 AND status = 'active'`,
    [id]
  );

  if (cert.rows.length === 0) {
    throw new NotFoundError('Certificate');
  }

  const notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await db.query(
    `UPDATE certificates SET not_after = $1, last_renewed_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [notAfter, id]
  );

  res.json({
    success: true,
    data: {
      message: 'Certificate renewed successfully',
      newExpiry: notAfter.toISOString()
    }
  });
});

// POST /api/v1/certificates/:id/revoke
router.post('/:id/revoke', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;
  const { reason } = req.body;

  const result = await db.query(
    `UPDATE certificates SET status = 'revoked', revocation_status = 'revoked',
     revocation_reason = $1, revoked_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND status = 'active'
     RETURNING id`,
    [reason || 'Unspecified', id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Certificate');
  }

  res.json({
    success: true,
    data: {
      message: 'Certificate revoked successfully',
      revokedAt: new Date().toISOString()
    }
  });
});

// GET /api/v1/certificates/expiring/list
router.get('/expiring/list', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { days = 30 } = req.query;

  const result = await db.query(
    `SELECT id, name, common_name, not_after, auto_renew FROM certificates
     WHERE not_after < NOW() + ($1 || ' days')::INTERVAL
     AND not_after > NOW() AND status = 'active'
     ORDER BY not_after ASC`,
    [days]
  );

  res.json({ success: true, data: { certificates: result.rows } });
});

export { router as certificatesRoutes };
