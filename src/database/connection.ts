import pg from 'pg';
import { logger } from '../utils/logger';

const { Pool } = pg;

export class Database {
  private pool: pg.Pool | null = null;

  async initialize() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DATABASE_POOL_SIZE || '20')
    });

    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Database connection established');
    } finally {
      client.release();
    }
  }

  getPool(): pg.Pool {
    if (!this.pool) throw new Error('Database not initialized');
    return this.pool;
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    const result = await this.pool!.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }
    return result;
  }

  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
