import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/connection';
import { AuditService } from '../services/audit';
import { NotFoundError, ValidationError } from '../middleware/error-handler';

const router = Router();

// GET /api/v1/access-requests
router.get('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  const result = await db.query(
    `SELECT ar.*, u.email as requester_email, u.first_name, u.last_name
     FROM access_requests ar
     JOIN users u ON ar.requester_id = u.id
     ORDER BY ar.created_at DESC`
  );

  res.json({ success: true, data: { requests: result.rows } });
});

// POST /api/v1/access-requests
router.post('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const audit: AuditService = req.app.locals.audit;
  const { resource_type, resource_id, resource_name, access_level, justification, duration } = req.body;

  if (!resource_type || !access_level || !justification) {
    throw new ValidationError('Resource type, access level, and justification are required');
  }

  const id = uuidv4();

  await db.query(
    `INSERT INTO access_requests (id, requester_id, resource_type, resource_id, resource_name, access_level, justification, duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, req.user?.id, resource_type, resource_id, resource_name, access_level, justification, duration]
  );

  await audit.log({
    eventType: 'access_request_created',
    action: 'create',
    status: 'success',
    actorId: req.user?.id,
    resourceType: 'access_request',
    resourceId: id,
    details: { resourceType: resource_type, accessLevel: access_level },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    data: { id, status: 'pending', createdAt: new Date().toISOString() }
  });
});

// POST /api/v1/access-requests/:id/approve
router.post('/:id/approve', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const audit: AuditService = req.app.locals.audit;
  const { id } = req.params;
  const { comment } = req.body;

  const result = await db.query(
    `UPDATE access_requests SET status = 'approved', approver_id = $1, approved_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND status = 'pending'
     RETURNING *`,
    [req.user?.id, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Access request');
  }

  await audit.log({
    eventType: 'access_request_approved',
    action: 'approve',
    status: 'success',
    actorId: req.user?.id,
    resourceType: 'access_request',
    resourceId: id,
    details: { comment },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    data: { message: 'Access request approved', approvedAt: new Date().toISOString() }
  });
});

// POST /api/v1/access-requests/:id/deny
router.post('/:id/deny', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;
  const { reason } = req.body;

  const result = await db.query(
    `UPDATE access_requests SET status = 'denied', approver_id = $1, denial_reason = $2, updated_at = NOW()
     WHERE id = $3 AND status = 'pending'
     RETURNING id`,
    [req.user?.id, reason, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Access request');
  }

  res.json({
    success: true,
    data: { message: 'Access request denied', deniedAt: new Date().toISOString() }
  });
});

export { router as accessRequestRoutes };
