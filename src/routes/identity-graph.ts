import { Router, Request, Response } from 'express';
import { Database } from '../database/connection';

const router = Router();

// GET /api/v1/identity-graph
router.get('/', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  // Get users as nodes
  const users = await db.query(
    `SELECT id, email as name, 'user' as type, status FROM users WHERE status = 'active' LIMIT 50`
  );

  // Get roles as nodes
  const roles = await db.query(
    `SELECT id, name, 'role' as type FROM roles LIMIT 20`
  );

  // Get secrets as nodes
  const secrets = await db.query(
    `SELECT id, name, 'secret' as type, type as secret_type FROM secrets WHERE deleted_at IS NULL LIMIT 50`
  );

  // Get privileged accounts as nodes
  const accounts = await db.query(
    `SELECT id, name, 'privileged_account' as type, type as account_type FROM privileged_accounts WHERE deleted_at IS NULL LIMIT 50`
  );

  // Get edges (user-role relationships)
  const userRoles = await db.query(
    `SELECT ur.user_id as source, ur.role_id as target, 'has_role' as relationship
     FROM user_roles ur`
  );

  res.json({
    success: true,
    data: {
      nodes: [
        ...users.rows.map(u => ({ ...u, id: `user-${u.id}` })),
        ...roles.rows.map(r => ({ ...r, id: `role-${r.id}` })),
        ...secrets.rows.map(s => ({ ...s, id: `secret-${s.id}` })),
        ...accounts.rows.map(a => ({ ...a, id: `account-${a.id}` }))
      ],
      edges: userRoles.rows.map(e => ({
        source: `user-${e.source}`,
        target: `role-${e.target}`,
        relationship: e.relationship
      }))
    }
  });
});

// GET /api/v1/identity-graph/escalation-paths
router.get('/escalation-paths', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  // Find users with direct admin access
  const adminUsers = await db.query(
    `SELECT u.id, u.email, r.name as role_name
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     WHERE r.name IN ('super_admin', 'security_admin')
     AND u.status = 'active'`
  );

  res.json({
    success: true,
    data: {
      paths: adminUsers.rows.map(u => ({
        userId: u.id,
        email: u.email,
        role: u.role_name,
        riskLevel: u.role_name === 'super_admin' ? 'critical' : 'high'
      }))
    }
  });
});

export { router as identityGraphRoutes };
