import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Facebook access tokens are credentials: anyone holding one can post as
// the Page. They're encrypted with AES-256-GCM before hitting Postgres and
// decrypted only inside server-side code that calls the Graph API.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32');
  }

  const decoded = Buffer.from(key, 'base64');
  if (decoded.length !== 32) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key. Generate one with: openssl rand -base64 32'
    );
  }

  return decoded;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function decryptToken(encoded: string): string {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
