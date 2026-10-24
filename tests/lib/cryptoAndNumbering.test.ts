// @vitest-environment node
import {
  getInvoiceNumberScope,
  isReservationForScope,
  reserveInvoiceNumberForScope,
} from '@/lib/invoice/invoiceNumbering';
import {
  decryptJson,
  decryptLegacyText,
  decryptText,
  encryptJson,
  encryptText,
  isEncrypted,
  pseudonymizeRateLimitIdentifier,
  signInvoiceNumberReservation,
  verifyInvoiceNumberReservation,
} from '@/lib/savedDataCrypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ prisma: { invoiceSequence: { upsert } } }));
beforeEach(() => {
  vi.stubEnv('INVOICE_DATA_ENCRYPTION_KEY', 'ab'.repeat(32));
  upsert.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('encrypted saved data', () => {
  it.each(['', 'plain text', 'Zażółć gęślą jaźń 🔐'])(
    'round trips text %j with randomized authenticated encryption',
    (text) => {
      const first = encryptText(text);
      const second = encryptText(text);
      expect(first).not.toBe(second);
      expect(isEncrypted(first)).toBe(true);
      expect(decryptText(first)).toBe(text);
      expect(decryptLegacyText(first)).toEqual({
        data: text,
        needsEncryption: false,
      });
    },
  );
  it.each([undefined, '', 'short', 'g'.repeat(64), 'a'.repeat(63)])(
    'fails explicitly for invalid keys %j',
    (key) => {
      vi.stubEnv('INVOICE_DATA_ENCRYPTION_KEY', key);
      expect(() => encryptText('secret')).toThrow('64 hexadecimal characters');
      expect(() => signInvoiceNumberReservation('payload')).toThrow(
        '64 hexadecimal characters',
      );
    },
  );
  it.each(['plain', 'enc:v2:iv:tag:data', 'enc:v1:iv:tag:data', 'enc:v1:a:b'])(
    'rejects invalid ciphertext %s',
    (ciphertext) => {
      expect(() => decryptText(ciphertext)).toThrow(
        /invalid format|invalid cryptographic parameters/,
      );
    },
  );
  it('rejects modified ciphertext, tag and wrong encryption keys', () => {
    const ciphertext = encryptText('sensitive data');
    const parts = ciphertext.split(':');
    const modified = [...parts];
    const body = Buffer.from(parts[4], 'base64url');
    body[0] ^= 1;
    modified[4] = body.toString('base64url');
    expect(() => decryptText(modified.join(':'))).toThrow();
    const tag = Buffer.from(parts[3], 'base64url');
    tag[0] ^= 1;
    parts[3] = tag.toString('base64url');
    expect(() => decryptText(parts.join(':'))).toThrow();
    vi.stubEnv('INVOICE_DATA_ENCRYPTION_KEY', 'cd'.repeat(32));
    expect(() => decryptText(ciphertext)).toThrow();
  });
  it.each([null, { name: 'Jan', amount: 10 }, ['a', 2], 42, 'legacy text'])(
    'distinguishes encrypted JSON from legacy data %j',
    (value) => {
      expect(decryptJson(encryptJson(value))).toEqual({
        data: value,
        needsEncryption: false,
      });
      expect(decryptJson(value)).toEqual({
        data: value,
        needsEncryption: true,
      });
    },
  );
  it('does not treat null legacy text as requiring migration and rejects encrypted non-JSON', () => {
    expect(decryptLegacyText(null)).toEqual({
      data: null,
      needsEncryption: false,
    });
    expect(decryptLegacyText('legacy')).toEqual({
      data: 'legacy',
      needsEncryption: true,
    });
    expect(isEncrypted('plain')).toBe(false);
    expect(() => decryptJson(encryptText('not json'))).toThrow(SyntaxError);
  });
  it('binds HMAC tokens to the exact payload and domains', () => {
    const token = signInvoiceNumberReservation('payload');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyInvoiceNumberReservation('payload', token)).toBe(true);
    expect(verifyInvoiceNumberReservation('different', token)).toBe(false);
    for (const invalid of [
      '',
      token.toUpperCase(),
      'a'.repeat(63),
      'z'.repeat(64),
    ]) {
      expect(verifyInvoiceNumberReservation('payload', invalid)).toBe(false);
    }
    const identifier = pseudonymizeRateLimitIdentifier(
      'saveInvoice',
      'user:123',
    );
    expect(identifier).toMatch(/^[a-f0-9]{64}$/);
    expect(identifier).toBe(
      pseudonymizeRateLimitIdentifier('saveInvoice', 'user:123'),
    );
    expect(identifier).not.toBe(
      pseudonymizeRateLimitIdentifier('saveParty', 'user:123'),
    );
    expect(identifier).not.toBe(
      pseudonymizeRateLimitIdentifier('saveInvoice', 'user:456'),
    );
    expect(identifier).not.toBe(signInvoiceNumberReservation('user:123'));
  });
});

describe('invoice numbering reservations', () => {
  it('scopes authenticated and anonymous callers separately', () => {
    expect(getInvoiceNumberScope('123')).toBe('user:123');
    expect(getInvoiceNumberScope(null)).toBe('anonymous');
    expect(getInvoiceNumberScope('')).toBe('anonymous');
  });
  it.each(['anonymous', 'user:123'])(
    'atomically increments and signs numbers for %s',
    async (scope) => {
      upsert.mockResolvedValue({ value: 12 });
      const reservation = await reserveInvoiceNumberForScope(scope, 2026);
      expect(upsert).toHaveBeenCalledWith({
        where: { scope_year: { scope, year: 2026 } },
        create: { scope, year: 2026, value: 1 },
        update: { value: { increment: 1 } },
        select: { value: true },
      });
      expect(reservation.number).toBe(
        scope === 'anonymous' ? 'A-12/2026' : '12/2026',
      );
      expect(isReservationForScope(reservation, scope, 2026)).toBe(true);
      expect(isReservationForScope(reservation, scope, 2027)).toBe(false);
      expect(isReservationForScope(reservation, 'user:other', 2026)).toBe(
        false,
      );
      expect(
        isReservationForScope(
          { ...reservation, token: '0'.repeat(64) },
          scope,
          2026,
        ),
      ).toBe(false);
    },
  );
  it.each([
    null,
    'value',
    {},
    { number: 1 },
    { number: '1/2026' },
    { number: '1/2026', token: 1 },
    { number: 'bad', token: 'token' },
    { number: 'A-1/2026', token: 'token' },
  ])('rejects malformed reservations %j', (input) => {
    expect(isReservationForScope(input, 'user:123', 2026)).toBe(false);
  });
  it('propagates database errors instead of issuing an unsigned fallback', async () => {
    const error = new Error('database unavailable');
    upsert.mockRejectedValue(error);
    await expect(reserveInvoiceNumberForScope('anonymous', 2026)).rejects.toBe(
      error,
    );
  });
});
