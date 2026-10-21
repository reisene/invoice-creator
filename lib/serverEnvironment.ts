type ServerEnvironment = Record<string, string | undefined>;

function isUrl(
  value: string | undefined,
  protocols: readonly string[],
): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function hasMinimumBytes(value: string | undefined, minimum: number): boolean {
  return (
    value !== undefined &&
    value.trim().length > 0 &&
    new TextEncoder().encode(value).byteLength >= minimum
  );
}

export function validateServerEnvironment(
  env: ServerEnvironment = process.env,
): void {
  const issues: string[] = [];

  if (!isUrl(env.DATABASE_URL_POOLED, ['postgres:', 'postgresql:'])) {
    issues.push('DATABASE_URL_POOLED must be a valid PostgreSQL URL.');
  }

  if (!isUrl(env.NEON_AUTH_BASE_URL, ['http:', 'https:'])) {
    issues.push('NEON_AUTH_BASE_URL must be a valid HTTP(S) URL.');
  }

  if (!hasMinimumBytes(env.NEON_AUTH_COOKIE_SECRET, 32)) {
    issues.push('NEON_AUTH_COOKIE_SECRET must be at least 32 bytes.');
  }

  if (!/^[\da-fA-F]{64}$/.test(env.INVOICE_DATA_ENCRYPTION_KEY ?? '')) {
    issues.push(
      'INVOICE_DATA_ENCRYPTION_KEY must be exactly 64 hexadecimal characters.',
    );
  }

  if (!hasMinimumBytes(env.CRON_SECRET, 16)) {
    issues.push('CRON_SECRET must be at least 16 bytes.');
  }

  if (!hasMinimumBytes(env.HEALTH_CHECK_SECRET, 32)) {
    issues.push('HEALTH_CHECK_SECRET must be at least 32 bytes.');
  }

  if (issues.length > 0) {
    throw new Error(
      `Invalid server environment configuration:\n${issues.map((issue) => `- ${issue}`).join('\n')}`,
    );
  }
}
