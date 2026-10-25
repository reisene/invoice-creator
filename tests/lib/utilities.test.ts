// @vitest-environment node
import { authErrorMessage } from '@/lib/authErrors';
import { getContactMessageRetentionCutoff } from '@/lib/contactMessageRetention';
import {
  COOKIE_CONSENT_CHOICES,
  allowsAnalytics,
  allowsReplay,
  getCookieConsentChoice,
  getCookieConsentCookieValue,
  getCookieConsentLabel,
  getCookieConsentLogCutoff,
  isCookieConsentChoice,
  parseCookieConsentCookie,
} from '@/lib/cookieConsent';
import {
  cleanPolishBankAccount,
  formatPolishBankAccount,
  getPolishBankName,
} from '@/lib/invoice/bankUtils';
import { parseRegistrationConsent } from '@/lib/legal/termsAcceptance';
import { getSentryTracesSampleRate } from '@/lib/sentrySampling';
import { validateServerEnvironment } from '@/lib/serverEnvironment';
import { socialImage } from '@/lib/socialImage';
import { numberToWords } from '@/lib/toWords';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('cookies and retention', () => {
  it.each(COOKIE_CONSENT_CHOICES)(
    'round trips the current consent %s',
    (choice) => {
      expect(isCookieConsentChoice(choice)).toBe(true);
      expect(
        parseCookieConsentCookie(getCookieConsentCookieValue(choice)),
      ).toBe(choice);
    },
  );
  it.each([
    null,
    undefined,
    3,
    {},
    '',
    '4:unknown',
    '3:ACCEPT_OPTIONAL',
    '3:REJECT_OPTIONAL',
    '2:ACCEPT_OPTIONAL',
  ])('rejects unsupported consent %j', (value) => {
    expect(isCookieConsentChoice(value)).toBe(false);
    if (typeof value === 'string' || value === undefined)
      expect(parseCookieConsentCookie(value)).toBeNull();
  });
  it.each([
    [false, false, 'REJECT_OPTIONAL', 'Tylko niezbędne'],
    [true, false, 'ACCEPT_ANALYTICS', 'Tylko analityka i wydajność'],
    [false, true, 'ACCEPT_REPLAY', 'Tylko odtwarzanie sesji'],
    [
      true,
      true,
      'ACCEPT_OPTIONAL',
      'Analityka i wydajność oraz odtwarzanie sesji',
    ],
  ] as const)(
    'keeps purposes independent: analytics %s, replay %s',
    (analytics, replay, choice, label) => {
      expect(getCookieConsentChoice(analytics, replay)).toBe(choice);
      expect(allowsAnalytics(choice)).toBe(analytics);
      expect(allowsReplay(choice)).toBe(replay);
      expect(getCookieConsentLabel(choice)).toBe(label);
    },
  );
  it('does not authorize either purpose without a current choice', () => {
    expect(allowsAnalytics(null)).toBe(false);
    expect(allowsReplay(null)).toBe(false);
  });
  it('subtracts UTC days and calendar months without mutating the input', () => {
    const now = new Date('2024-02-29T12:34:56.789Z');
    expect(getContactMessageRetentionCutoff(now).toISOString()).toBe(
      '2023-02-28T12:34:56.789Z',
    );
    expect(getCookieConsentLogCutoff(now).toISOString()).toBe(
      '2024-01-30T12:34:56.789Z',
    );
    expect(now.toISOString()).toBe('2024-02-29T12:34:56.789Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(getContactMessageRetentionCutoff()).toEqual(
      getContactMessageRetentionCutoff(now),
    );
    expect(getCookieConsentLogCutoff()).toEqual(getCookieConsentLogCutoff(now));
  });
});

describe('formatting and public constants', () => {
  it('normalizes, truncates, formats and recognizes Polish bank accounts', () => {
    const digits = '61109010140000071219812874';
    expect(
      cleanPolishBankAccount(`pl 61-1090-1014 0000 0712 1981 2874abc999`),
    ).toBe(digits);
    expect(formatPolishBankAccount(digits)).toBe(
      '61 1090 1014 0000 0712 1981 2874',
    );
    expect(formatPolishBankAccount('letters')).toBe('');
    expect(formatPolishBankAccount('6')).toBe('6');
    expect(formatPolishBankAccount('61')).toBe('61');
    expect(formatPolishBankAccount('61109')).toBe('61 109');
    expect(getPolishBankName(digits)).toBe('Santander Bank Polska');
    expect(getPolishBankName('123')).toBeNull();
    expect(getPolishBankName('619999')).toBeNull();
  });
  it.each([
    [0, 'zero złotych 00/100'],
    [1, 'jeden złoty 00/100'],
    [2.03, 'dwa złote 03/100'],
    [4, 'cztery złote 00/100'],
    [5, 'pięć złotych 00/100'],
    [12, 'dwanaście złotych 00/100'],
    [14, 'czternaście złotych 00/100'],
    [22.999, 'dwadzieścia trzy złote 00/100'],
  ])('spells %s with the correct currency form', (amount, expected) => {
    expect(numberToWords(amount)).toBe(expected);
  });
  it('exposes the social image metadata', () => {
    expect(socialImage).toEqual({
      url: '/og-image.png',
      width: 1200,
      height: 630,
      type: 'image/png',
      alt: 'Invoice Creator – rachunek do umowy zlecenia w kilka minut',
    });
  });
});

describe('authentication messages and consent', () => {
  it.each([
    ['INVALID_EMAIL_OR_PASSWORD', 'Nieprawidłowy adres e-mail lub hasło.'],
    ['INVALID_PASSWORD', 'Nieprawidłowe hasło.'],
    ['INVALID_EMAIL', 'Nieprawidłowy adres e-mail.'],
    ['EMAIL_NOT_VERIFIED', 'Adres e-mail nie został zweryfikowany.'],
    ['USER_ALREADY_EXISTS', 'Konto z tym adresem e-mail już istnieje.'],
    [
      'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      'Konto z tym adresem e-mail już istnieje.',
    ],
    ['USER_NOT_FOUND', 'Nie znaleziono konta.'],
    ['PASSWORD_TOO_SHORT', 'Hasło jest zbyt krótkie.'],
    ['PASSWORD_TOO_LONG', 'Hasło jest zbyt długie.'],
    ['INVALID_TOKEN', 'Link jest nieprawidłowy lub wygasł.'],
    ['TOKEN_EXPIRED', 'Link wygasł.'],
    ['INVALID_OTP', 'Kod jest nieprawidłowy lub wygasł.'],
    ['OTP_EXPIRED', 'Kod wygasł. Wyślij nowy kod.'],
    ['TOO_MANY_ATTEMPTS', 'Zbyt wiele prób. Wyślij nowy kod.'],
    ['SESSION_EXPIRED', 'Sesja wygasła. Zaloguj się ponownie.'],
    ['FAILED_TO_CREATE_USER', 'Nie udało się utworzyć konta.'],
  ])('localizes %s regardless of case', (code, message) => {
    expect(authErrorMessage({ code: code.toLowerCase() }, 'Fallback')).toBe(
      message,
    );
  });
  it('prioritizes throttling and falls back without leaking server messages', () => {
    expect(
      authErrorMessage({ status: 429, code: 'INVALID_PASSWORD' }, 'Fallback'),
    ).toContain('Zbyt wiele prób');
    for (const error of [
      undefined,
      null,
      {},
      { code: 'UNKNOWN', message: 'secret' },
      { code: '' },
    ]) {
      expect(authErrorMessage(error, 'Fallback')).toBe('Fallback');
    }
  });
  it.each(['EMAIL_PASSWORD', 'MAGIC_LINK'] as const)(
    'parses %s registration consent and optional immediate start',
    (method) => {
      for (const immediate of [false, true]) {
        const form = new FormData();
        form.set('acceptTerms', 'accepted');
        form.set('termsVersion', 'v3');
        form.set('email', ' JAN@EXAMPLE.COM ');
        if (immediate) form.set('requestImmediateStart', 'requested');
        expect(parseRegistrationConsent(form, method, 'v3')).toEqual({
          consent: {
            email: 'jan@example.com',
            termsVersion: 'v3',
            registrationMethod: method,
            earlyServiceStartRequested: immediate,
          },
        });
      }
    },
  );
  it('rejects missing acceptance, stale terms and missing or non-text email', () => {
    const form = new FormData();
    expect(parseRegistrationConsent(form, 'MAGIC_LINK', 'v3')).toEqual({
      error: 'Zaakceptuj Regulamin, aby utworzyć Konto.',
    });
    form.set('acceptTerms', 'accepted');
    expect(parseRegistrationConsent(form, 'MAGIC_LINK', 'v3')).toHaveProperty(
      'error',
      expect.stringContaining('Wersja'),
    );
    form.set('termsVersion', 'v3');
    for (const email of ['', ' ', new Blob(['email'])]) {
      form.set('email', email);
      expect(parseRegistrationConsent(form, 'MAGIC_LINK', 'v3')).toEqual({
        error: 'Podaj adres e-mail.',
      });
    }
  });
});

describe('environment and site configuration', () => {
  it.each([undefined, '', '  '])('uses default sampling for %j', (value) => {
    expect(getSentryTracesSampleRate(value)).toBe(0.1);
  });
  it.each(['0', '1', ' 0.25 '])('accepts sampling %s', (value) => {
    expect(getSentryTracesSampleRate(value)).toBe(Number(value));
  });
  it.each(['NaN', 'Infinity', '-0.1', '1.01'])(
    'rejects sampling %s',
    (value) => {
      expect(() => getSentryTracesSampleRate(value)).toThrow('between 0 and 1');
    },
  );
  it('validates process defaults, byte lengths and URL protocols', () => {
    const env = {
      DATABASE_URL_POOLED: 'postgresql://db.example.com/invoices',
      NEON_AUTH_BASE_URL: 'http://auth.example.com',
      NEON_AUTH_COOKIE_SECRET: 'ą'.repeat(16),
      INVOICE_DATA_ENCRYPTION_KEY: 'AB'.repeat(32),
      CRON_SECRET: 'ą'.repeat(8),
      HEALTH_CHECK_SECRET: 'x'.repeat(32),
    };
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    expect(() => validateServerEnvironment()).not.toThrow();
    expect(() =>
      validateServerEnvironment({ ...env, CRON_SECRET: ' '.repeat(32) }),
    ).toThrow('CRON_SECRET');
    expect(() =>
      validateServerEnvironment({ ...env, NEON_AUTH_BASE_URL: 'https:' }),
    ).toThrow('NEON_AUTH_BASE_URL');
  });
  it.each([
    [
      undefined,
      undefined,
      'http://localhost:3000',
      'github.com/reisene/invoice-creator',
    ],
    ['example.com///', 'ignored.test', 'https://example.com', 'example.com'],
    [
      undefined,
      'http://localhost:4567/',
      'http://localhost:4567',
      'localhost:4567',
    ],
    ['', 'example.org/', 'https://example.org', 'example.org'],
    ['https://', undefined, 'https:', 'https://'],
  ])(
    'normalizes public=%j server=%j',
    async (publicUrl, serverUrl, expected, display) => {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', publicUrl);
      vi.stubEnv('SITE_URL', serverUrl);
      const site = await import('@/lib/siteUrl');
      expect(site.siteUrl).toBe(expected);
      expect(site.getSiteDisplayUrl()).toBe(display);
    },
  );
  it('reports all missing or malformed environment settings without their values', () => {
    expect(() => validateServerEnvironment({})).toThrow('DATABASE_URL_POOLED');
    let message = '';
    try {
      validateServerEnvironment({
        DATABASE_URL_POOLED: 'invalid-private-database',
        NEON_AUTH_BASE_URL: 'ftp://auth.example.com',
        NEON_AUTH_COOKIE_SECRET: 'short',
        INVOICE_DATA_ENCRYPTION_KEY: 'invalid-private-key',
        CRON_SECRET: 'short',
        HEALTH_CHECK_SECRET: 'short',
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      message = error.message;
    }
    for (const key of [
      'DATABASE_URL_POOLED',
      'NEON_AUTH_BASE_URL',
      'NEON_AUTH_COOKIE_SECRET',
      'INVOICE_DATA_ENCRYPTION_KEY',
      'CRON_SECRET',
      'HEALTH_CHECK_SECRET',
    ]) {
      expect(message).toContain(key);
    }
    expect(message).not.toContain('invalid-private');
  });
});
