import { logServerError } from '@/lib/serverLogger';
import 'server-only';

export async function sendRetentionHeartbeat(): Promise<
  'sent' | 'failed' | 'not_configured'
> {
  const value = process.env.RETENTION_HEARTBEAT_URL;
  if (!value) {
    console.warn(
      '[retention-heartbeat] RETENTION_HEARTBEAT_URL is not configured.',
    );
    return 'not_configured';
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('Invalid heartbeat URL configuration.');
    }

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    await response.body?.cancel();
    if (!response.ok) {
      logServerError(
        '[retention-heartbeat] Monitoring service rejected heartbeat.',
        {
          statusCode: response.status,
        },
      );
      return 'failed';
    }
    return 'sent';
  } catch (error) {
    logServerError('[retention-heartbeat] Failed to send heartbeat.', error);
    return 'failed';
  }
}
