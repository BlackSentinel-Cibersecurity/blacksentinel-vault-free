import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/connection';
import { logger } from '../utils/logger';

export class AuditService {
  constructor(private db: Database) {}

  async log(params: {
    eventType: string;
    action: string;
    status: string;
    severity?: string;
    actorId?: string;
    actorType?: string;
    actorName?: string;
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    sessionId?: string;
    riskScore?: number;
  }) {
    try {
      await this.db.query(
        `INSERT INTO audit_events (
          id, event_type, action, status, severity,
          actor_id, actor_type, actor_name,
          resource_type, resource_id, resource_name,
          details, ip_address, user_agent, request_id, session_id, risk_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          uuidv4(),
          params.eventType,
          params.action,
          params.status,
          params.severity || 'low',
          params.actorId,
          params.actorType,
          params.actorName,
          params.resourceType,
          params.resourceId,
          params.resourceName,
          JSON.stringify(params.details || {}),
          params.ipAddress,
          params.userAgent,
          params.requestId,
          params.sessionId,
          params.riskScore
        ]
      );
    } catch (error) {
      logger.error('Failed to write audit log:', error);
    }
  }

  async query(params: {
    eventTypes?: string[];
    statuses?: string[];
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
    severity?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }) {
    let query = 'SELECT * FROM audit_events WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (params.eventTypes?.length) {
      query += ` AND event_type = ANY($${paramIndex})`;
      values.push(params.eventTypes);
      paramIndex++;
    }

    if (params.statuses?.length) {
      query += ` AND status = ANY($${paramIndex})`;
      values.push(params.statuses);
      paramIndex++;
    }

    if (params.actorId) {
      query += ` AND actor_id = $${paramIndex}`;
      values.push(params.actorId);
      paramIndex++;
    }

    if (params.resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      values.push(params.resourceType);
      paramIndex++;
    }

    if (params.startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const limit = params.limit || 50;
    const offset = ((params.page || 1) - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows;
  }

  async getStats() {
    const result = await this.db.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed_events,
        COUNT(CASE WHEN severity IN ('high', 'critical') THEN 1 END) as high_severity,
        COUNT(DISTINCT actor_id) as unique_actors,
        COUNT(DISTINCT resource_type) as resource_types
      FROM audit_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    return result.rows[0];
  }
}
