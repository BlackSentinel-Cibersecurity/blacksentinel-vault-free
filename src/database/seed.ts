import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    logger.info('Seeding database...');

    // Create admin user
    const adminId = uuidv4();
    const passwordHash = await bcrypt.hash('Admin@123456', 12);

    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, status, mfa_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [adminId, 'admin@blacksentinel.com', passwordHash, 'System', 'Administrator', 'active', false]
    );

    // Assign super_admin role
    const roleResult = await pool.query(`SELECT id FROM roles WHERE name = 'super_admin'`);
    if (roleResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, granted_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [adminId, roleResult.rows[0].id, adminId]
      );
    }

    // Create sample secrets
    const secretId = uuidv4();
    await pool.query(
      `INSERT INTO secrets (id, name, description, type, status, value_encrypted, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [secretId, 'AWS Production API Key', 'Main AWS API key for production', 'api_key', 'active', 'encrypted_value_placeholder', '{production,aws}', adminId]
    );

    // Create sample privileged account
    await pool.query(
      `INSERT INTO privileged_accounts (id, name, username, type, host, status, credentials_encrypted, managed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [uuidv4(), 'Production Database Admin', 'dbadmin', 'database', 'prod-db.company.com', 'active', '{"password": "encrypted"}', adminId]
    );

    logger.info('Database seeded successfully');
    logger.info('Admin credentials: admin@blacksentinel.com / Admin@123456');

  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);
