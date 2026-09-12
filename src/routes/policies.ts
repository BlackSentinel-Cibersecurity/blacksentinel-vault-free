import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/connection';
import { AuditService } from '../services/audit';
import { NotFoundError, ValidationError } from '../middleware/error-handler';

const router = Router();

// GET /api/v1/policies
router.get('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  const result = await db.query(
    `SELECT id, name, description, type, enabled, priority, version, effect, created_at
     FROM policies ORDER BY priority DESC, created_at DESC`
  );

  res.json({ success: true, data: { policies: result.rows } });
});

// POST /api/v1/policies
router.post('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const audit: AuditService = req.app.locals.audit;
  const { name, description, type, effect, targets, conditions, actions } = req.body;

  if (!name || !type || !effect) {
    throw new ValidationError('Name, type, and effect are required');
  }

  const id = uuidv4();

  await db.query(
    `INSERT INTO policies (id, name, description, type, effect, targets, conditions, actions, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, name, description, type, effect, JSON.stringify(targets || []), JSON.stringify(conditions || []), JSON.stringify(actions || []), req.user?.id]
  );

  await audit.log({
    eventType: 'policy_created',
    action: 'create',
    status: 'success',
    actorId: req.user?.id,
    resourceType: 'policy',
    resourceId: id,
    resourceName: name,
    details: { type, effect },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    data: { id, name, type, effect, enabled: true, createdAt: new Date().toISOString() }
  });
});

// PUT /api/v1/policies/:id
router.put('/:id', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;
  const { name, description, enabled, priority, targets, conditions, actions } = req.body;

  const result = await db.query(
    `UPDATE policies SET
     name = COALESCE($1, name), description = COALESCE($2, description),
     enabled = COALESCE($3, enabled), priority = COALESCE($4, priority),
     targets = COALESCE($5, targets), conditions = COALESCE($6, conditions),
     actions = COALESCE($7, actions), version = version + 1, updated_at = NOW()
     WHERE id = $8 RETURNING id`,
    [name, description, enabled, priority, targets ? JSON.stringify(targets) : null, conditions ? JSON.stringify(conditions) : null, actions ? JSON.stringify(actions) : null, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Policy');
  }

  res.json({ success: true, data: { message: 'Policy updated successfully' } });
});

// DELETE /api/v1/policies/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { id } = req.params;

  const result = await db.query(
    `DELETE FROM policies WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Policy');
  }

  res.json({ success: true, data: { message: 'Policy deleted successfully' } });
});

// POST /api/v1/policies/evaluate
router.post('/evaluate', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;
  const { identity_id, resource, action } = req.body;

  const policies = await db.query(
    `SELECT * FROM policies WHERE enabled = true ORDER BY priority DESC`
  );

  let decision = 'deny';
  const matchedPolicies: any[] = [];

  for (const policy of policies.rows) {
    const targets = typeof policy.targets === 'string' ? JSON.parse(policy.targets) : policy.targets;
    const conditions = typeof policy.conditions === 'string' ? JSON.parse(policy.conditions) : policy.conditions;

    // Simplified policy evaluation
    if (targets.some((t: any) => t.type === 'all' || t.values?.includes(identity_id))) {
      matchedPolicies.push(policy.id);
      if (policy.effect === 'allow') {
        decision = 'allow';
        break;
      }
    }
  }

  // Log evaluation
  await db.query(
    `INSERT INTO policy_evaluations (policy_id, identity_id, resource, action, decision, matched_conditions)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [matchedPolicies[0] || null, identity_id, resource, action, decision, JSON.stringify(matchedPolicies)]
  );

  res.json({
    success: true,
    data: {
      decision,
      matchedPolicies,
      evaluatedAt: new Date().toISOString()
    }
  });
});

export { router as policiesRoutes };
