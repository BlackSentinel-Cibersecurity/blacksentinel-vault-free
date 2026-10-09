import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const PLACEHOLDER = /change|your[-_]|example|placeholder|fallback|super-secret|^secret$/i;

let jwtCached: string | undefined;

/**
 * The JWT signing secret for access and refresh tokens.
 *
 * SECURITY FIX: tokens were verified with `process.env.JWT_SECRET || 'secret'`,
 * so an install without JWT_SECRET accepted a super_admin token anyone could
 * sign with the word "secret". There is no built-in secret any more: without a
 * real JWT_SECRET (32+ characters) Vault signs with a random per-process secret
 * and sessions end when it restarts. Run scripts/init-env.sh to keep one.
 */
export function jwtSecret(): string {
  if (jwtCached) return jwtCached;
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32 && !PLACEHOLDER.test(fromEnv)) {
    jwtCached = fromEnv;
  } else {
    logger.warn(
      fromEnv
        ? 'JWT_SECRET is shorter than 32 characters or still a placeholder; using a random secret for this run instead.'
        : 'JWT_SECRET is not set; using a random secret for this run. Sessions end on restart. Run scripts/init-env.sh to keep one.'
    );
    jwtCached = crypto.randomBytes(32).toString('hex');
  }
  return jwtCached;
}

/**
 * The 32-byte AES-256-GCM master key every stored secret is encrypted with.
 *
 * SECURITY FIX: docker-compose shipped a published default MASTER_KEY, and it
 * was not even hex, so the key decoded to zero bytes and encryption failed.
 * Order now: MASTER_KEY (64 hex characters) from the environment; otherwise the
 * key file at MASTER_KEY_FILE (default ./data/master.key), created with a fresh
 * random key on first start. Losing that key means losing the secrets it
 * protects, so back it up.
 */
export function masterKey(): Buffer {
  const fromEnv = process.env.MASTER_KEY?.trim();
  if (fromEnv) {
    if (/^[0-9a-f]{64}$/i.test(fromEnv)) return Buffer.from(fromEnv, 'hex');
    throw new Error('MASTER_KEY must be 64 hex characters (32 bytes). Generate one with: openssl rand -hex 32');
  }
  const file = path.resolve(process.env.MASTER_KEY_FILE || 'data/master.key');
  if (fs.existsSync(file)) {
    const hex = fs.readFileSync(file, 'utf8').trim();
    if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error(`${file} does not hold a 64-hex-character master key`);
    return Buffer.from(hex, 'hex');
  }
  const key = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, key.toString('hex') + '\n', { mode: 0o600, flag: 'wx' });
  logger.warn(`Generated a new master key at ${file}. Back it up: without it, stored secrets cannot be decrypted.`);
  return key;
}
