import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';
import 'server-only';

type Window = `${number} ${'s' | 'm' | 'h'}`;

const POLICIES = {
  importData: { requests: 10, window: '10 m' },
  exportData: { requests: 10, window: '10 m' },
  saveInvoice: { requests: 60, window: '1 m' },
  reserveNumber: { requests: 30, window: '1 m' },
  saveParty: { requests: 60, window: '1 m' },
  saveBankAccount: { requests: 30, window: '1 m' },
  contactForm: { requests: 5, window: '10 m' },
  accountSensitive: { requests: 10, window: '10 m' },
} satisfies Record<string, { requests: number; window: Window }>;

export type RateLimitPolicy = keyof typeof POLICIES;

const TOO_MANY = 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';

let redis: Redis | null | undefined;
const limiters = new Map<RateLimitPolicy, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function getLimiter(policy: RateLimitPolicy): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;

  let limiter = limiters.get(policy);
  if (!limiter) {
    const { requests, window } = POLICIES[policy];
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `ratelimit:${policy}`,
    });
    limiters.set(policy, limiter);
  }
  return limiter;
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Checks the limit for a signed-in user (by id) or an anonymous caller (by IP).
 * Without Upstash configuration, or when Upstash is unreachable, requests are
 * allowed so that the app keeps working.
 */
export async function checkRateLimit(
  policy: RateLimitPolicy,
  userId?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const limiter = getLimiter(policy);
  if (!limiter) return { ok: true };

  try {
    const identifier = userId ? `user:${userId}` : `ip:${await getClientIp()}`;
    const { success } = await limiter.limit(identifier);
    return success ? { ok: true } : { ok: false, message: TOO_MANY };
  } catch {
    return { ok: true };
  }
}
