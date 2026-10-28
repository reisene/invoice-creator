// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  log: vi.fn(),
}));

vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));

import { verifyTurnstileToken } from '@/lib/turnstile';

function form(token = 'turnstile-token') {
  const data = new FormData();
  if (token) data.set('cf-turnstile-response', token);
  return data;
}

function siteverifyResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
  vi.stubEnv('TURNSTILE_HOSTNAMES', 'invoice-creator.draugskoll.dev');
  vi.stubGlobal('fetch', mocks.fetch);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Turnstile verification', () => {
  it('posts the token to Siteverify and requires a matching action and hostname', async () => {
    mocks.fetch.mockResolvedValue(
      siteverifyResponse({
        success: true,
        action: 'contact',
        hostname: 'invoice-creator.draugskoll.dev',
      }),
    );

    expect(await verifyTurnstileToken(form(), 'contact')).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: 'test-secret',
          response: 'turnstile-token',
        }),
      }),
    );
  });

  it('accepts a full SITE_URL-style value in the hostname allowlist', async () => {
    vi.stubEnv(
      'TURNSTILE_HOSTNAMES',
      'https://invoice-creator.draugskoll.dev/contact/',
    );
    mocks.fetch.mockResolvedValue(
      siteverifyResponse({
        success: true,
        action: 'contact',
        hostname: 'invoice-creator.draugskoll.dev',
      }),
    );

    expect(await verifyTurnstileToken(form(), 'contact')).toBe(true);
  });

  it.each([
    [
      {
        success: false,
        action: 'contact',
        hostname: 'invoice-creator.draugskoll.dev',
      },
    ],
    [
      {
        success: true,
        action: 'other',
        hostname: 'invoice-creator.draugskoll.dev',
      },
    ],
    [{ success: true, action: 'contact', hostname: 'attacker.example' }],
    [{ success: true, action: 'contact' }],
  ])('rejects invalid Siteverify result %j', async (body) => {
    mocks.fetch.mockResolvedValue(siteverifyResponse(body));

    expect(await verifyTurnstileToken(form(), 'contact')).toBe(false);
  });

  it('rejects a missing token', async () => {
    expect(await verifyTurnstileToken(new FormData(), 'contact')).toBe(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('rejects an oversized token', async () => {
    expect(await verifyTurnstileToken(form('x'.repeat(2049)), 'contact')).toBe(
      false,
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('fails closed and logs when verification configuration is missing', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');

    expect(await verifyTurnstileToken(form(), 'contact')).toBe(false);
    expect(mocks.log).toHaveBeenCalledWith(
      '[turnstile] Verification configuration is incomplete.',
      expect.any(Error),
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('fails closed and logs a Siteverify transport failure', async () => {
    const error = new Error('network unavailable');
    mocks.fetch.mockRejectedValue(error);

    expect(await verifyTurnstileToken(form(), 'contact')).toBe(false);
    expect(mocks.log).toHaveBeenCalledWith(
      '[turnstile] Siteverify request failed.',
      error,
    );
  });

  it('fails closed when Siteverify returns a non-success status', async () => {
    mocks.fetch.mockResolvedValue(siteverifyResponse({}, 503));

    expect(await verifyTurnstileToken(form(), 'contact')).toBe(false);
    expect(mocks.log).toHaveBeenCalledWith(
      '[turnstile] Siteverify request failed.',
      expect.any(Error),
    );
  });
});
