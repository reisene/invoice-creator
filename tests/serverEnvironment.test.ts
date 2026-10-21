import { validateServerEnvironment } from '@/lib/serverEnvironment';
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

const validEnvironment = {
  DATABASE_URL_POOLED: 'postgresql://user:password@db.example.com/invoices',
  NEON_AUTH_BASE_URL: 'https://auth.example.com',
  NEON_AUTH_COOKIE_SECRET: 'c'.repeat(32),
  INVOICE_DATA_ENCRYPTION_KEY: 'a'.repeat(64),
  CRON_SECRET: 'c'.repeat(16),
  HEALTH_CHECK_SECRET: 'h'.repeat(32),
};

describe('validateServerEnvironment', () => {
  it('accepts valid required server settings', () => {
    assert.doesNotThrow(() => validateServerEnvironment(validEnvironment));
  });

  it('reports every missing required setting without exposing values', () => {
    let message = '';

    assert.throws(
      () => validateServerEnvironment({}),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        message = error.message;
        return true;
      },
    );

    for (const key of Object.keys(validEnvironment)) {
      assert.ok(message.includes(key), `Expected error to mention ${key}`);
    }
  });

  it('rejects malformed URLs and invalid secret formats', () => {
    let message = '';

    assert.throws(
      () =>
        validateServerEnvironment({
          ...validEnvironment,
          DATABASE_URL_POOLED: 'not-a-database-url',
          NEON_AUTH_BASE_URL: 'ftp://auth.example.com',
          NEON_AUTH_COOKIE_SECRET: 'short',
          INVOICE_DATA_ENCRYPTION_KEY: 'not-a-hex-key',
          CRON_SECRET: 'short',
          HEALTH_CHECK_SECRET: 'short',
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        message = error.message;
        return true;
      },
    );

    for (const key of Object.keys(validEnvironment)) {
      assert.ok(message.includes(key), `Expected error to mention ${key}`);
    }
    assert.ok(!message.includes('not-a-database-url'));
  });
});
