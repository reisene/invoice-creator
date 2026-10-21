import { logServerError } from '@/lib/serverLogger';
import 'server-only';

const TIMEOUT_MS = 5000;

type ProbeResult = {
  status: 'ok' | 'error' | 'not_configured' | 'limited';
  code?: string;
  latencyMs: number;
};

class ProbeError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function probe(
  name: string,
  configured: boolean,
  run: (signal: AbortSignal) => Promise<void>,
): Promise<ProbeResult> {
  if (!configured) return { status: 'not_configured', latencyMs: 0 };
  const start = performance.now();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      run(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new ProbeError('timeout'));
        }, TIMEOUT_MS);
      }),
    ]);
    return { status: 'ok', latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    logServerError(`[health/${name}] Dependency probe failed.`, error);
    const code = error instanceof ProbeError ? error.code : 'probe_failed';
    return {
      status: code === 'permission_limited' ? 'limited' : 'error',
      code,
      latencyMs: Math.round(performance.now() - start),
    };
  } finally {
    clearTimeout(timer);
  }
}

function checkResponse(response: Response): void {
  if (!response.ok) throw new ProbeError(`http_${response.status}`);
}

export async function checkDependencies() {
  const env = process.env;
  const [database, upstash, neonAuth, resend] = await Promise.all([
    probe('database', Boolean(env.DATABASE_URL_POOLED), async () => {
      const { prisma } = await import('@/lib/db');
      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT 1`;
        },
        { maxWait: 1000, timeout: 4000 },
      );
    }),
    probe(
      'upstash',
      Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
      async (signal) => {
        const response = await fetch(env.UPSTASH_REDIS_REST_URL!, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['PING']),
          cache: 'no-store',
          redirect: 'error',
          signal,
        });
        checkResponse(response);
        const body: unknown = await response.json();
        if (
          typeof body !== 'object' ||
          body === null ||
          !('result' in body) ||
          body.result !== 'PONG'
        ) {
          throw new ProbeError('unexpected_response');
        }
      },
    ),
    probe('neonAuth', Boolean(env.NEON_AUTH_BASE_URL), async (signal) => {
      const url = `${env.NEON_AUTH_BASE_URL!.replace(/\/$/, '')}/get-session`;
      const response = await fetch(url, {
        cache: 'no-store',
        redirect: 'error',
        signal,
      });
      checkResponse(response);
      const body: unknown = await response.json();
      if (body !== null) throw new ProbeError('unexpected_response');
    }),
    probe('resend', Boolean(env.RESEND_API_KEY), async (signal) => {
      const response = await fetch('https://api.resend.com/domains?limit=1', {
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
        cache: 'no-store',
        redirect: 'error',
        signal,
      });
      if (response.status === 403) {
        await response.body?.cancel();
        throw new ProbeError('permission_limited');
      }
      checkResponse(response);
      const body: unknown = await response.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('data' in body) ||
        !Array.isArray(body.data)
      ) {
        throw new ProbeError('unexpected_response');
      }
    }),
  ]);

  const checks = { database, upstash, neonAuth, resend };
  const healthy = Object.values(checks).every((check) => check.status === 'ok');
  return {
    status: healthy ? 'ok' : 'degraded',
    checkedAt: new Date().toISOString(),
    checks,
  };
}
