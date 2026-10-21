import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import 'server-only';

const ENCRYPTED_PREFIX = 'enc:v1:';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const value = process.env.INVOICE_DATA_ENCRYPTION_KEY;
  if (!value || !/^[\da-fA-F]{64}$/.test(value)) {
    throw new Error(
      'INVOICE_DATA_ENCRYPTION_KEY must be configured as 64 hexadecimal characters.',
    );
  }
  return Buffer.from(value, 'hex');
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptText(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv, {
    authTagLength: TAG_LENGTH,
  });
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export function decryptText(value: string): string {
  const parts = value.split(':');
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}:` !== ENCRYPTED_PREFIX) {
    throw new Error('Encrypted data has an invalid format.');
  }

  const [, , ivValue, tagValue, ciphertextValue] = parts;
  const iv = Buffer.from(ivValue, 'base64url');
  const tag = Buffer.from(tagValue, 'base64url');
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('Encrypted data has invalid cryptographic parameters.');
  }

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptJson(value: unknown): string {
  return encryptText(JSON.stringify(value));
}

export function decryptJson(value: unknown): {
  data: unknown;
  needsEncryption: boolean;
} {
  if (typeof value === 'string' && isEncrypted(value)) {
    return { data: JSON.parse(decryptText(value)), needsEncryption: false };
  }
  return { data: value, needsEncryption: true };
}

export function decryptLegacyText(value: string | null): {
  data: string | null;
  needsEncryption: boolean;
} {
  if (value === null) return { data: null, needsEncryption: false };
  if (isEncrypted(value)) {
    return { data: decryptText(value), needsEncryption: false };
  }
  return { data: value, needsEncryption: true };
}

export function signInvoiceNumberReservation(payload: string): string {
  return createHmac('sha256', getEncryptionKey())
    .update(`invoice-number-reservation:v1:${payload}`)
    .digest('hex');
}

export function pseudonymizeRateLimitIdentifier(
  policy: string,
  identifier: string,
): string {
  return createHmac('sha256', getEncryptionKey())
    .update(`rate-limit:v1:${policy}:${identifier}`)
    .digest('hex');
}

export function verifyInvoiceNumberReservation(
  payload: string,
  token: string,
): boolean {
  if (!/^[\da-f]{64}$/.test(token)) return false;
  const expected = Buffer.from(signInvoiceNumberReservation(payload), 'hex');
  const actual = Buffer.from(token, 'hex');
  return timingSafeEqual(expected, actual);
}
