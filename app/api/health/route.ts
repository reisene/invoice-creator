import { checkDependencies } from '@/lib/dependencyHealth';
import { createHash, timingSafeEqual } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10;

const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  const secret = process.env.HEALTH_CHECK_SECRET;
  if (!secret) {
    console.error('[health] HEALTH_CHECK_SECRET is not configured.');
    return Response.json(
      { error: 'Health check is not configured.' },
      { status: 503, headers },
    );
  }

  const actual = createHash('sha256')
    .update(request.headers.get('authorization') ?? '')
    .digest();
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  if (!timingSafeEqual(actual, expected)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers });
  }

  const result = await checkDependencies();
  return Response.json(result, {
    status: result.status === 'ok' ? 200 : 503,
    headers,
  });
}
