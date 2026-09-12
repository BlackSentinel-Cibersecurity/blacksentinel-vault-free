import { Router, Request, Response } from 'express';
import { AuditService } from '../services/audit';

const router = Router();

// GET /api/v1/audit
router.get('/', async (req: Request, res: Response) => {
  const audit: AuditService = req.app.locals.audit;
  const { eventTypes, statuses, actorId, resourceType, startDate, endDate, page, limit } = req.query;

  const events = await audit.query({
    eventTypes: eventTypes ? (eventTypes as string).split(',') : undefined,
    statuses: statuses ? (statuses as string).split(',') : undefined,
    actorId: actorId as string,
    resourceType: resourceType as string,
    startDate: startDate as string,
    endDate: endDate as string,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 50
  });

  res.json({ success: true, data: { events } });
});

// GET /api/v1/audit/stats
router.get('/stats', async (req: Request, res: Response) => {
  const audit: AuditService = req.app.locals.audit;

  const stats = await audit.getStats();

  res.json({ success: true, data: stats });
});

export { router as auditRoutes };
