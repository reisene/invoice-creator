import 'server-only';

import { logServerError } from '@/lib/serverLogger';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESPONSE_FIELD = 'cf-turnstile-response';
const MAX_TOKEN_LENGTH = 2048;

type SiteverifyResponse = {
  success?: unknown;
  action?: unknown;
  hostname?: unknown;
};

function normalizeHostname(hostname: string): string {
  const value = hostname.trim();
  if (!value) return '';

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`,
    );
    return url.hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
}

export async function verifyTurnstileToken(
  formData: FormData,
  expectedAction: string,
): Promise<boolean> {
  const token = formData.get(RESPONSE_FIELD);
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const expectedHostnames = new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map(normalizeHostname)
      .filter(Boolean),
  );

  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return false;
  }

  if (!secret || expectedHostnames.size === 0) {
    logServerError(
      '[turnstile] Verification configuration is incomplete.',
      new Error('Turnstile secret or hostname allowlist is missing.'),
    );
    return false;
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret, response: token }),
    });

    if (!response.ok) {
      throw new Error(`Turnstile siteverify returned ${response.status}.`);
    }

    const result = (await response.json()) as SiteverifyResponse;
    return (
      result.success === true &&
      result.action === expectedAction &&
      typeof result.hostname === 'string' &&
      expectedHostnames.has(normalizeHostname(result.hostname))
    );
  } catch (error) {
    logServerError('[turnstile] Siteverify request failed.', error);
    return false;
  }
}
