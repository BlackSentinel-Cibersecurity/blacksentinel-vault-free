import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    logger.info('Starting database migration...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    logger.info('Database migration completed successfully');

    // Seed default data
    await seedDefaultData(pool);
    logger.info('Default data seeded');

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function seedDefaultData(pool: Pool) {
  // Insert default roles
  const roles = [
    { name: 'super_admin', description: 'Full system access', type: 'builtin' },
    { name: 'security_admin', description: 'Security and compliance management', type: 'builtin' },
    { name: 'pam_admin', description: 'Privileged access management', type: 'builtin' },
    { name: 'secret_admin', description: 'Secrets management', type: 'builtin' },
    { name: 'secret_reader', description: 'Read-only access to secrets', type: 'builtin' },
    { name: 'compliance_admin', description: 'Compliance management', type: 'builtin' },
    { name: 'viewer', description: 'Read-only access', type: 'builtin' }
  ];

  for (const role of roles) {
    await pool.query(
      `INSERT INTO roles (name, description, type) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
      [role.name, role.description, role.type]
    );
  }

  // Insert compliance frameworks
  const frameworks = [
    { name: 'ISO 27001', version: '2022', description: 'Information Security Management' },
    { name: 'NIST CSF', version: '2.0', description: 'Cybersecurity Framework' },
    { name: 'SOC 2', version: 'Type II', description: 'Service Organization Control' },
    { name: 'PCI DSS', version: '4.0', description: 'Payment Card Industry Data Security Standard' },
    { name: 'HIPAA', version: '2023', description: 'Health Insurance Portability and Accountability Act' },
    { name: 'GDPR', version: '2018', description: 'General Data Protection Regulation' }
  ];

  for (const fw of frameworks) {
    await pool.query(
      `INSERT INTO compliance_frameworks (name, version, description) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [fw.name, fw.version, fw.description]
    );
  }
}

migrate().catch(console.error);
