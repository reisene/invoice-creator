// @vitest-environment node
import { logServerError } from '@/lib/serverLogger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  redis: vi.fn(),
  limiter: vi.fn(),
  sliding: vi.fn(),
  headers: vi.fn(),
  hash: vi.fn(),
  capture: vi.fn(),
  tag: vi.fn(),
  context: vi.fn(),
}));
vi.mock('@upstash/redis', () => ({ Redis: mocks.redis }));
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(mocks.limiter, { slidingWindow: mocks.sliding }),
}));
vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('@/lib/savedDataCrypto', () => ({
  pseudonymizeRateLimitIdentifier: mocks.hash,
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.capture,
  withScope: (
    callback: (scope: {
      setTag: typeof mocks.tag;
      setContext: typeof mocks.context;
    }) => void,
  ) => callback({ setTag: mocks.tag, setContext: mocks.context }),
}));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
  mocks.redis.mockImplementation(function () {
    return { redis: true };
  });
  mocks.limiter.mockImplementation(function () {
    return { limit: mocks.limit };
  });
  mocks.sliding.mockReturnValue('sliding-window');
  mocks.limit.mockResolvedValue({ success: true });
  mocks.headers.mockResolvedValue(new Headers());
  mocks.hash.mockReturnValue('hashed-id');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('server error reporting', () => {
  it.each([
    null,
    undefined,
    'secret',
    5,
    {},
    { code: 123 },
    { code: 'not-safe' },
    { statusCode: '500' },
    { statusCode: 399 },
    { statusCode: 600 },
    { statusCode: 500.5 },
  ])('omits unsafe error metadata from logs: %j', (error) => {
    logServerError('context', error);
    expect(console.error).toHaveBeenCalledWith('context', {});
    expect(mocks.capture).toHaveBeenCalledWith(error);
    expect(mocks.tag).toHaveBeenCalledWith('error.source', 'serverLogger');
    expect(mocks.context).toHaveBeenCalledWith('server_error', {
      context: 'context',
    });
  });
  it.each([400, 599])(
    'retains only valid Prisma codes and HTTP status %s',
    (statusCode) => {
      const error = { code: 'P2002', statusCode, message: 'private value' };
      logServerError('context', error);
      expect(console.error).toHaveBeenCalledWith('context', {
        code: 'P2002',
        statusCode,
      });
      expect(mocks.context).toHaveBeenCalledWith('server_error', {
        context: 'context',
        code: 'P2002',
        statusCode,
      });
    },
  );
});

describe('rate limiting', () => {
  it.each(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'])(
    'allows requests without %s and caches the absent client',
    async (missing) => {
      vi.stubEnv(missing, undefined);
      const { checkRateLimit } = await import('@/lib/rateLimit');
      expect(await checkRateLimit('contactForm')).toEqual({ ok: true });
      expect(await checkRateLimit('contactForm')).toEqual({ ok: true });
      expect(mocks.redis).not.toHaveBeenCalled();
      expect(mocks.limit).not.toHaveBeenCalled();
    },
  );
  it('reuses Redis and policy limiters and hashes authenticated identifiers', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    expect(await checkRateLimit('saveInvoice', 'user-1')).toEqual({ ok: true });
    await checkRateLimit('saveInvoice', 'user-2');
    expect(mocks.redis).toHaveBeenCalledOnce();
    expect(mocks.redis).toHaveBeenCalledWith({
      url: 'https://redis.example.com',
      token: 'test-token',
    });
    expect(mocks.limiter).toHaveBeenCalledOnce();
    expect(mocks.limiter).toHaveBeenCalledWith({
      redis: { redis: true },
      limiter: 'sliding-window',
      prefix: 'ratelimit:v2:saveInvoice',
    });
    expect(mocks.sliding).toHaveBeenCalledWith(60, '1 m');
    expect(mocks.hash).toHaveBeenCalledWith('saveInvoice', 'user:user-1');
    expect(mocks.limit).toHaveBeenCalledWith('hashed-id');
    expect(mocks.headers).not.toHaveBeenCalled();
    await checkRateLimit('contactForm', 'user-1');
    expect(mocks.sliding).toHaveBeenLastCalledWith(5, '10 m');
    expect(mocks.limiter).toHaveBeenCalledTimes(2);
  });
  it.each([
    [
      { 'x-forwarded-for': ' 1.2.3.4 , 5.6.7.8', 'x-real-ip': '9.0.0.1' },
      '1.2.3.4',
    ],
    [{ 'x-real-ip': '9.0.0.1' }, '9.0.0.1'],
    [{ 'x-forwarded-for': ' ', 'x-real-ip': '9.0.0.1' }, '9.0.0.1'],
    [{}, 'unknown'],
  ])(
    'hashes the anonymous address from headers %j',
    async (headers, expected) => {
      mocks.headers.mockResolvedValue(new Headers(headers));
      const { checkRateLimit } = await import('@/lib/rateLimit');
      await checkRateLimit('contactForm');
      expect(mocks.hash).toHaveBeenCalledWith('contactForm', `ip:${expected}`);
    },
  );
  it('rejects exhausted limits and explicitly logs service failures before allowing requests', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    mocks.limit.mockResolvedValueOnce({ success: false });
    expect(await checkRateLimit('contactForm', 'user-1')).toEqual({
      ok: false,
      message: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
    });
    const error = new Error('redis unreachable');
    mocks.limit.mockRejectedValueOnce(error);
    expect(await checkRateLimit('contactForm', 'user-1')).toEqual({ ok: true });
    expect(console.error).toHaveBeenCalledWith(
      '[rate-limit] Upstash request failed.',
      {},
    );
    expect(mocks.capture).toHaveBeenCalledWith(error);
  });
});
