import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from './encryption';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    service = new EncryptionService();
    await service.initialize();
  });

  it('encrypts and decrypts a value back to the original plaintext', () => {
    const plaintext = 'super-secret-value-123';
    const ciphertext = service.encrypt(plaintext);

    expect(ciphertext).not.toContain(plaintext);
    expect(service.decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces a different ciphertext for the same plaintext on each call (random IV)', () => {
    const plaintext = 'same-input';
    const first = service.encrypt(plaintext);
    const second = service.encrypt(plaintext);

    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe(plaintext);
    expect(service.decrypt(second)).toBe(plaintext);
  });

  it('throws when the auth tag / ciphertext has been tampered with', () => {
    const encrypted = JSON.parse(service.encrypt('tamper-check'));
    encrypted.data = encrypted.data.slice(0, -2) + (encrypted.data.slice(-2) === '00' ? '11' : '00');

    expect(() => service.decrypt(JSON.stringify(encrypted))).toThrow();
  });

  it('hashes deterministically', () => {
    const a = service.hash('input');
    const b = service.hash('input');
    const c = service.hash('different-input');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates tokens and API keys of the expected shape', () => {
    const token = service.generateToken(16);
    expect(token).toMatch(/^[a-f0-9]{32}$/);

    const apiKey = service.generateApiKey();
    expect(apiKey.startsWith('bs_')).toBe(true);
  });

  it('generates a password of the requested length using the expected charset', () => {
    const password = service.generatePassword(20);
    expect(password).toHaveLength(20);
    expect(password).toMatch(/^[a-zA-Z0-9!@#$%^&*()]+$/);
  });
});
