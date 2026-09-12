import { Router, Request, Response } from 'express';
import { Database } from '../database/connection';

const router = Router();

// Free edition: no PAM module, so no privileged-account/session stats here
// (those tables belong to a feature this repo doesn't include).
router.get('/overview', async (req: Request, res: Response) => {
  const db: Database = req.app.locals.db;

  const [secretsStats, recentEvents, certificatesStats] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '30 days' THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN last_rotated_at < NOW() - INTERVAL '90 days' OR last_rotated_at IS NULL THEN 1 END) as stale
      FROM secrets WHERE deleted_at IS NULL
    `),
    db.query(`
      SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 10
    `),
    db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN not_after < NOW() + INTERVAL '30 days' THEN 1 END) as expiring_soon
      FROM certificates WHERE status = 'active'
    `)
  ]);

  const failedAttempts = await db.query(`
    SELECT COUNT(*) as count FROM audit_events
    WHERE event_type = 'login_failed' AND created_at > NOW() - INTERVAL '24 hours'
  `);

  const blockedAttempts = await db.query(`
    SELECT COUNT(*) as count FROM audit_events
    WHERE event_type = 'login_failed' AND status = 'blocked'
    AND created_at > NOW() - INTERVAL '24 hours'
  `);

  res.json({
    success: true,
    data: {
      secrets: secretsStats.rows[0],
      certificates: certificatesStats.rows[0],
      recentEvents: recentEvents.rows,
      failedAttempts: parseInt(failedAttempts.rows[0].count),
      blockedAttempts: parseInt(blockedAttempts.rows[0].count)
    }
  });
});

export { router as dashboardRoutes };
