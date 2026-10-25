// @vitest-environment node
import { checkDependencies } from '@/lib/dependencyHealth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  query: vi.fn(),
  fetch: vi.fn(),
  log: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));
const upstashUrl = 'https://redis.example.com';
const authUrl = 'https://auth.example.com/';
beforeEach(() => {
  vi.resetAllMocks();
  for (const key of [
    'DATABASE_URL_POOLED',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'NEON_AUTH_BASE_URL',
    'RESEND_API_KEY',
  ])
    vi.stubEnv(key, undefined);
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.transaction.mockImplementation(
    async (
      callback: (tx: { $queryRaw: typeof mocks.query }) => Promise<void>,
    ) => callback({ $queryRaw: mocks.query }),
  );
  mocks.fetch.mockImplementation(async (url: string) => {
    if (url === upstashUrl) return Response.json({ result: 'PONG' });
    if (url.includes('/get-session')) return Response.json(null);
    return Response.json({ data: [] });
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function configure() {
  vi.stubEnv('DATABASE_URL_POOLED', 'postgresql://db.example.com/test');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', upstashUrl);
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
  vi.stubEnv('NEON_AUTH_BASE_URL', authUrl);
  vi.stubEnv('RESEND_API_KEY', 'test-key');
}
describe('dependency health probes', () => {
  it('reports each unconfigured dependency without network or database requests', async () => {
    const result = await checkDependencies();
    expect(result.status).toBe('degraded');
    expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    for (const check of Object.values(result.checks))
      expect(check).toEqual({ status: 'not_configured', latencyMs: 0 });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('checks database, Redis, anonymous auth and Resend read-only with bounded requests', async () => {
    configure();
    const result = await checkDependencies();
    expect(result.status).toBe('ok');
    for (const check of Object.values(result.checks)) {
      expect(check.status).toBe('ok');
      expect(check.latencyMs).toBeGreaterThanOrEqual(0);
    }
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 1000,
      timeout: 4000,
    });
    expect(mocks.query).toHaveBeenCalledWith(['SELECT 1']);
    expect(mocks.fetch).toHaveBeenCalledWith(
      upstashUrl,
      expect.objectContaining({
        method: 'POST',
        body: '["PING"]',
        cache: 'no-store',
        redirect: 'error',
        signal: expect.any(AbortSignal),
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      }),
    );
    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/get-session',
      expect.objectContaining({ cache: 'no-store', redirect: 'error' }),
    );
    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/domains?limit=1',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-key' },
      }),
    );
  });
  it.each([
    ['upstash', 'UPSTASH_REDIS_REST_URL', upstashUrl],
    ['neonAuth', 'NEON_AUTH_BASE_URL', authUrl],
    ['resend', 'RESEND_API_KEY', 'test-key'],
  ] as const)('reports HTTP errors for %s', async (dependency, key, value) => {
    vi.stubEnv(key, value);
    if (dependency === 'upstash')
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
    mocks.fetch.mockResolvedValue(new Response(null, { status: 503 }));
    const result = await checkDependencies();
    expect(result.checks[dependency]).toMatchObject({
      status: 'error',
      code: 'http_503',
    });
    expect(mocks.log).toHaveBeenCalledWith(
      `[health/${dependency}] Dependency probe failed.`,
      expect.any(Error),
    );
  });
  it.each([null, 'PONG', {}, { result: 'NO' }])(
    'rejects unexpected Redis response %j',
    async (body) => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', upstashUrl);
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
      mocks.fetch.mockResolvedValue(Response.json(body));
      expect((await checkDependencies()).checks.upstash).toMatchObject({
        status: 'error',
        code: 'unexpected_response',
      });
    },
  );
  it('rejects a non-null anonymous auth response', async () => {
    vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.com');
    mocks.fetch.mockResolvedValue(Response.json({ user: {} }));
    expect((await checkDependencies()).checks.neonAuth).toMatchObject({
      status: 'error',
      code: 'unexpected_response',
    });
  });
  it.each([null, 'data', {}, { data: {} }])(
    'rejects unexpected Resend response %j',
    async (body) => {
      vi.stubEnv('RESEND_API_KEY', 'test-key');
      mocks.fetch.mockResolvedValue(Response.json(body));
      expect((await checkDependencies()).checks.resend).toMatchObject({
        status: 'error',
        code: 'unexpected_response',
      });
    },
  );
  it.each([false, true])(
    'reports limited Resend permissions with response body=%s',
    async (hasBody) => {
      vi.stubEnv('RESEND_API_KEY', 'test-key');
      const cancel = vi.fn();
      mocks.fetch.mockResolvedValue({
        status: 403,
        body: hasBody ? { cancel } : null,
      });
      expect((await checkDependencies()).checks.resend).toMatchObject({
        status: 'limited',
        code: 'permission_limited',
      });
      expect(cancel).toHaveBeenCalledTimes(hasBody ? 1 : 0);
    },
  );
  it('maps ordinary database and malformed JSON failures without exposing their messages', async () => {
    configure();
    const error = new Error('private database details');
    mocks.transaction.mockRejectedValue(error);
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });
    const result = await checkDependencies();
    for (const check of Object.values(result.checks))
      expect(check).toMatchObject({ status: 'error', code: 'probe_failed' });
    expect(JSON.stringify(result)).not.toContain('private database details');
  });
  it('aborts stalled probes at five seconds and reports timeouts', async () => {
    vi.useFakeTimers();
    vi.stubEnv('NEON_AUTH_BASE_URL', authUrl);
    let signal: AbortSignal | undefined;
    mocks.fetch.mockImplementation((_url, options: RequestInit) => {
      signal = options.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    const result = checkDependencies();
    await vi.advanceTimersByTimeAsync(4999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await result).checks.neonAuth).toMatchObject({
      status: 'error',
      code: 'timeout',
    });
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
