import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('secrets', () => {
  const saved = { ...process.env };
  beforeEach(() => vi.resetModules());
  afterEach(() => { process.env = { ...saved }; });

  it('never signs with a placeholder JWT secret', async () => {
    process.env.JWT_SECRET = 'super-secret-jwt-key-change-in-production';
    const { jwtSecret } = await import('./secrets');
    expect(jwtSecret()).not.toBe(process.env.JWT_SECRET);
    expect(jwtSecret()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses a real JWT secret from the environment', async () => {
    process.env.JWT_SECRET = 'a'.repeat(16) + '9f3c1e7b2d4a6085c3e1f7a9b2d4c6e8';
    const { jwtSecret } = await import('./secrets');
    expect(jwtSecret()).toBe(process.env.JWT_SECRET);
  });

  it('keeps the same random JWT secret for the whole run', async () => {
    delete process.env.JWT_SECRET;
    const { jwtSecret } = await import('./secrets');
    expect(jwtSecret()).toBe(jwtSecret());
  });

  it('rejects a MASTER_KEY that is not 64 hex characters', async () => {
    process.env.MASTER_KEY = 'super-secret-master-key-change-in-production-64-chars!!';
    const { masterKey } = await import('./secrets');
    expect(() => masterKey()).toThrow(/64 hex/);
  });

  it('creates a master key file once and reuses it', async () => {
    delete process.env.MASTER_KEY;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-key-'));
    process.env.MASTER_KEY_FILE = path.join(dir, 'master.key');
    const { masterKey } = await import('./secrets');
    const first = masterKey();
    expect(first).toHaveLength(32);
    expect(masterKey().equals(first)).toBe(true);
    expect(fs.statSync(process.env.MASTER_KEY_FILE).mode & 0o777).toBe(0o600);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
