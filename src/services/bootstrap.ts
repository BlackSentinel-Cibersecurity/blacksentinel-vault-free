import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Database } from '../database/connection';
import { logger } from '../utils/logger';

const BUILTIN_ROLES: [string, string][] = [
  ['super_admin', 'Full system access'],
  ['security_admin', 'Security and compliance management'],
  ['pam_admin', 'Privileged access management'],
  ['secret_admin', 'Secrets management'],
  ['secret_reader', 'Read-only access to secrets'],
  ['compliance_admin', 'Compliance management'],
  ['viewer', 'Read-only access'],
];

/**
 * First-start setup for a fresh database.
 *
 * Under docker compose only schema.sql runs, so Vault used to start with no
 * roles and no users: nobody could sign in. This adds the built-in roles and,
 * when there are no users at all, one super_admin. Its password is
 * ADMIN_PASSWORD (12+ characters) or, when that is not set, a random one
 * printed once in this log. It replaces the seed's published 'Admin@123456'.
 */
export async function bootstrap(db: Database): Promise<void> {
  for (const [name, description] of BUILTIN_ROLES) {
    await db.query(
      `INSERT INTO roles (name, description, type) VALUES ($1, $2, 'builtin') ON CONFLICT (name) DO NOTHING`,
      [name, description]
    );
  }

  const users = await db.query(`SELECT COUNT(*)::int AS n FROM users WHERE deleted_at IS NULL`);
  if (users.rows[0].n > 0) return;

  const email = process.env.ADMIN_EMAIL?.trim() || 'admin@blacksentinel.com';
  const configured = process.env.ADMIN_PASSWORD?.trim();
  const fromEnv = !!configured && configured.length >= 12;
  const password = fromEnv ? configured! : crypto.randomBytes(12).toString('base64url');

  const created = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, status)
     VALUES ($1, $2, 'System', 'Administrator', 'active') RETURNING id`,
    [email, await bcrypt.hash(password, 12)]
  );
  const adminId = created.rows[0].id;
  await db.query(
    `INSERT INTO user_roles (user_id, role_id, granted_by)
     SELECT $1, id, $1 FROM roles WHERE name = 'super_admin'`,
    [adminId]
  );

  if (fromEnv) {
    logger.info(`First admin created: ${email} (password from ADMIN_PASSWORD)`);
  } else {
    logger.warn(`First admin created: ${email} / ${password}  <- shown only this once; sign in and change it.`);
  }
}
