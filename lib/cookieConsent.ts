export const COOKIE_CONSENT_COOKIE = 'cookie-consent';
export const COOKIE_CONSENT_VERSION = '1';
export const COOKIE_CONSENT_LOG_RETENTION_DAYS = 30;
export const COOKIE_SETTINGS_EVENT = 'cookie-consent:open-settings';

export const COOKIE_CONSENT_CHOICES = [
  'ACCEPT_OPTIONAL',
  'REJECT_OPTIONAL',
] as const;

export type CookieConsentChoice = (typeof COOKIE_CONSENT_CHOICES)[number];

export function getCookieConsentLogCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - COOKIE_CONSENT_LOG_RETENTION_DAYS);
  return cutoff;
}

export function isCookieConsentChoice(
  value: unknown,
): value is CookieConsentChoice {
  return (
    typeof value === 'string' &&
    COOKIE_CONSENT_CHOICES.some((choice) => choice === value)
  );
}

export function getCookieConsentCookieValue(
  choice: CookieConsentChoice,
): string {
  return `${COOKIE_CONSENT_VERSION}:${choice}`;
}

export function parseCookieConsentCookie(
  value: string | undefined,
): CookieConsentChoice | null {
  const prefix = `${COOKIE_CONSENT_VERSION}:`;
  if (!value?.startsWith(prefix)) return null;

  const choice = value.slice(prefix.length);
  return isCookieConsentChoice(choice) ? choice : null;
}
