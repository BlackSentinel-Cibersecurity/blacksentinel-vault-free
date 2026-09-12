import crypto from 'crypto';
import { logger } from '../utils/logger';

export class EncryptionService {
  private masterKey: Buffer | null = null;
  private algorithm = 'aes-256-gcm';

  async initialize() {
    const masterKeyHex = process.env.MASTER_KEY;
    if (!masterKeyHex || masterKeyHex.length < 64) {
      logger.warn('MASTER_KEY not set or too short, generating temporary key');
      this.masterKey = crypto.randomBytes(32);
    } else {
      this.masterKey = Buffer.from(masterKeyHex.substring(0, 64), 'hex');
    }
  }

  encrypt(plaintext: string): string {
    if (!this.masterKey) throw new Error('Encryption service not initialized');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as any).getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm
    });
  }

  decrypt(encryptedData: string): string {
    if (!this.masterKey) throw new Error('Encryption service not initialized');

    const { iv, data, authTag, algorithm } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      algorithm || this.algorithm,
      this.masterKey,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateApiKey(): string {
    return `bs_${crypto.randomBytes(32).toString('hex')}`;
  }

  generatePassword(length: number = 32): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let password = '';
    const randomValues = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }
    return password;
  }
}
