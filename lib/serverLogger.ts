import * as Sentry from '@sentry/nextjs';
import 'server-only';

export function logServerError(context: string, error: unknown): void {
  const details: { code?: string; statusCode?: number } = {};
  if (typeof error === 'object' && error !== null) {
    if (
      'code' in error &&
      typeof error.code === 'string' &&
      /^P\d{4}$/.test(error.code)
    ) {
      details.code = error.code;
    }
    if (
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode <= 599
    ) {
      details.statusCode = error.statusCode;
    }
  }
  console.error(context, details);
  Sentry.withScope((scope) => {
    scope.setTag('error.source', 'serverLogger');
    scope.setContext('server_error', { context, ...details });
    Sentry.captureException(error);
  });
}
