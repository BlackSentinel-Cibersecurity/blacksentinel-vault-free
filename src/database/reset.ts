import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

async function reset() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    logger.info('Resetting database...');

    // Drop all tables
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Run schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);

    logger.info('Database reset completed');
  } catch (error) {
    logger.error('Reset failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

reset().catch(console.error);
