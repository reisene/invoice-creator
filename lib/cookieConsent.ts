export const COOKIE_CONSENT_COOKIE = 'cookie-consent';
export const COOKIE_CONSENT_VERSION = '4';
export const COOKIE_CONSENT_LOG_RETENTION_DAYS = 30;
export const COOKIE_SETTINGS_EVENT = 'cookie-consent:open-settings';
export const COOKIE_CONSENT_CHANGED_EVENT = 'cookie-consent:changed';

export const COOKIE_CONSENT_CHOICES = [
  'ACCEPT_OPTIONAL',
  'REJECT_OPTIONAL',
  'ACCEPT_ANALYTICS',
  'ACCEPT_REPLAY',
] as const;

export type CookieConsentChoice = (typeof COOKIE_CONSENT_CHOICES)[number];

export function allowsAnalytics(choice: CookieConsentChoice | null): boolean {
  return choice === 'ACCEPT_OPTIONAL' || choice === 'ACCEPT_ANALYTICS';
}

export function allowsReplay(choice: CookieConsentChoice | null): boolean {
  return choice === 'ACCEPT_OPTIONAL' || choice === 'ACCEPT_REPLAY';
}

export function getCookieConsentChoice(
  analytics: boolean,
  replay: boolean,
): CookieConsentChoice {
  if (analytics && replay) return 'ACCEPT_OPTIONAL';
  if (analytics) return 'ACCEPT_ANALYTICS';
  if (replay) return 'ACCEPT_REPLAY';
  return 'REJECT_OPTIONAL';
}

export function getCookieConsentLabel(choice: CookieConsentChoice): string {
  switch (choice) {
    case 'ACCEPT_OPTIONAL':
      return 'Analityka i wydajność oraz odtwarzanie sesji';
    case 'ACCEPT_ANALYTICS':
      return 'Tylko analityka i wydajność';
    case 'ACCEPT_REPLAY':
      return 'Tylko odtwarzanie sesji';
    case 'REJECT_OPTIONAL':
      return 'Tylko niezbędne';
  }
}

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
