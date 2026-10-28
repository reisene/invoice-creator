// @vitest-environment node
import { submitContactForm } from '@/app/contact/actions';
import {
  clearCookieConsent,
  saveCookieConsent,
} from '@/app/cookie-consent/actions';
import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_VERSION,
} from '@/lib/cookieConsent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bot: vi.fn(),
  userId: vi.fn(),
  rateLimit: vi.fn(),
  contactCreate: vi.fn(),
  consentCreate: vi.fn(),
  adminEmail: vi.fn(),
  userEmail: vi.fn(),
  turnstile: vi.fn(),
  log: vi.fn(),
  cookies: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('botid/server', () => ({ checkBotId: mocks.bot }));
vi.mock('@/lib/currentUser', () => ({ getCurrentUserId: mocks.userId }));
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: mocks.rateLimit }));
vi.mock('@/lib/db', () => ({
  prisma: {
    contactMessage: { create: mocks.contactCreate },
    cookieConsent: { create: mocks.consentCreate },
  },
}));
vi.mock('@/lib/email', () => ({
  sendAdminContactNotification: mocks.adminEmail,
  sendUserContactConfirmation: mocks.userEmail,
}));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));
vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: mocks.turnstile,
}));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    name: ' Jan Kowalski ',
    email: ' jan@example.com ',
    category: ' Pytanie ogólne ',
    message: ' Proszę o wyjaśnienie sposobu obliczeń. ',
    'cf-turnstile-response': 'turnstile-token',
    ...overrides,
  }))
    data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.bot.mockResolvedValue({ isBot: false });
  mocks.turnstile.mockResolvedValue(true);
  mocks.userId.mockResolvedValue('user-1');
  mocks.rateLimit.mockResolvedValue({ ok: true });
  mocks.cookies.mockResolvedValue({ set: mocks.set, delete: mocks.delete });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('contact submissions', () => {
  it('rejects submissions when Turnstile verification fails', async () => {
    mocks.turnstile.mockResolvedValue(false);

    expect(await submitContactForm(null, form())).toEqual({
      ok: false,
      message: expect.stringContaining('Weryfikacja antyspamowa'),
    });
    expect(mocks.turnstile).toHaveBeenCalledWith(
      expect.any(FormData),
      'contact',
    );
    expect(mocks.bot).not.toHaveBeenCalled();
    expect(mocks.contactCreate).not.toHaveBeenCalled();
  });

  it('rejects bots before checking limits or writing data', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.bot.mockResolvedValue({ isBot: true });
    expect(await submitContactForm(null, form())).toEqual({
      ok: false,
      message: expect.stringContaining('antyspamowa'),
    });
    expect(warn).toHaveBeenCalledWith('[contact] BotID rejected submission.');
    expect(mocks.userId).not.toHaveBeenCalled();
    expect(mocks.contactCreate).not.toHaveBeenCalled();
    expect(mocks.adminEmail).not.toHaveBeenCalled();
  });

  it('fails closed and logs unavailable bot verification', async () => {
    const error = new Error('BotID unavailable');
    mocks.bot.mockRejectedValue(error);
    expect(await submitContactForm(null, form())).toEqual({
      ok: false,
      message: expect.stringContaining('Nie udało się zweryfikować'),
    });
    expect(mocks.log).toHaveBeenCalledWith(
      '[contact] BotID verification failed.',
      error,
    );
    expect(mocks.contactCreate).not.toHaveBeenCalled();
  });

  it('returns the rate-limit message without storing or sending', async () => {
    mocks.rateLimit.mockResolvedValue({ ok: false, message: 'Limit' });
    expect(await submitContactForm(null, form())).toEqual({
      ok: false,
      message: 'Limit',
    });
    expect(mocks.rateLimit).toHaveBeenCalledWith('contactForm', 'user-1');
    expect(mocks.contactCreate).not.toHaveBeenCalled();
    expect(mocks.userEmail).not.toHaveBeenCalled();
  });

  it('silently discards honeypot submissions without side effects', async () => {
    expect(
      await submitContactForm(null, form({ hp_website: ' spam.example ' })),
    ).toEqual({
      ok: true,
      message: 'Twoja wiadomość została przesłana pomyślnie.',
    });
    expect(mocks.contactCreate).not.toHaveBeenCalled();
    expect(mocks.adminEmail).not.toHaveBeenCalled();
  });

  it.each([
    [{ name: '' }, 'min. 2'],
    [{ name: 'a' }, 'min. 2'],
    [{ name: 'a'.repeat(101) }, '100 znaków'],
    [{ email: '' }, 'adres e-mail'],
    [{ email: 'invalid' }, 'adres e-mail'],
    [{ email: `${'x'.repeat(140)}@example.com` }, 'adres e-mail'],
    [{ subject: 'a'.repeat(201) }, '200 znaków'],
    [{ category: 'a'.repeat(201) }, '200 znaków'],
    [{ message: '' }, 'minimum 10'],
    [{ message: 'a'.repeat(9) }, 'minimum 10'],
    [{ message: 'a'.repeat(5001) }, '5000 znaków'],
  ])('validates %j before persistence', async (overrides, message) => {
    expect(await submitContactForm(null, form(overrides))).toEqual({
      ok: false,
      message: expect.stringContaining(message),
    });
    expect(mocks.contactCreate).not.toHaveBeenCalled();
    expect(mocks.adminEmail).not.toHaveBeenCalled();
  });

  it('handles missing form fields', async () => {
    expect(await submitContactForm(null, new FormData())).toEqual({
      ok: false,
      message: expect.stringContaining('min. 2'),
    });
    expect(mocks.contactCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['Własny temat', 'Pytanie ogólne', 'Własny temat'],
    ['', 'Pytanie ogólne', 'Pytanie ogólne'],
    ['', '', 'Wiadomość z formularza'],
  ])('selects subject %s / %s', async (subject, category, expectedSubject) => {
    expect(await submitContactForm(null, form({ subject, category }))).toEqual({
      ok: true,
      message: expect.stringContaining('Dziękujemy'),
    });
    const values = {
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      subject: expectedSubject,
      message: 'Proszę o wyjaśnienie sposobu obliczeń.',
      userId: 'user-1',
    };
    expect(mocks.contactCreate).toHaveBeenCalledWith({ data: values });
    expect(mocks.adminEmail).toHaveBeenCalledWith({ ...values, category });
    expect(mocks.userEmail).toHaveBeenCalledWith({ ...values, category });
    expect(mocks.bot).toHaveBeenCalledWith({
      advancedOptions: { checkLevel: 'basic' },
    });
  });

  it.each([
    { name: 'ab', email: 'a@b.co', subject: 's', message: 'a'.repeat(10) },
    {
      name: 'n'.repeat(100),
      email: `${'a'.repeat(145)}@b.co`,
      subject: 's'.repeat(200),
      message: 'a'.repeat(5000),
    },
  ])('accepts exact validation boundaries', async (values) => {
    expect(await submitContactForm(null, form(values))).toMatchObject({
      ok: true,
    });
    expect(mocks.contactCreate).toHaveBeenCalledOnce();
  });

  it('stores anonymous messages with a null owner', async () => {
    mocks.userId.mockResolvedValue(undefined);
    expect(await submitContactForm(null, form())).toMatchObject({ ok: true });
    expect(mocks.contactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });

  it.each(['admin', 'user', 'both'])(
    'does not roll back a message after %s email failure',
    async (target) => {
      if (target !== 'user')
        mocks.adminEmail.mockRejectedValue(new Error('mail'));
      if (target !== 'admin')
        mocks.userEmail.mockRejectedValue(new Error('mail'));
      expect(await submitContactForm(null, form())).toMatchObject({ ok: true });
      expect(mocks.contactCreate).toHaveBeenCalledOnce();
      expect(mocks.adminEmail).toHaveBeenCalledOnce();
      expect(mocks.userEmail).toHaveBeenCalledOnce();
    },
  );

  it('logs database failure and does not send emails', async () => {
    const error = new Error('database unavailable');
    mocks.contactCreate.mockRejectedValue(error);
    expect(await submitContactForm(null, form())).toEqual({
      ok: false,
      message: expect.stringContaining('nieoczekiwany błąd'),
    });
    expect(mocks.log).toHaveBeenCalledWith(
      'Błąd zapisu wiadomości kontaktowej:',
      error,
    );
    expect(mocks.adminEmail).not.toHaveBeenCalled();
    expect(mocks.userEmail).not.toHaveBeenCalled();
  });
});

describe('cookie preferences', () => {
  it.each([undefined, null, '', 'accept', {}, true, 1])(
    'rejects invalid choice %j without side effects',
    async (choice) => {
      expect(await saveCookieConsent(choice)).toEqual({
        ok: false,
        message: 'Nieprawidłowy wybór cookies.',
      });
      expect(mocks.userId).not.toHaveBeenCalled();
      expect(mocks.consentCreate).not.toHaveBeenCalled();
      expect(mocks.cookies).not.toHaveBeenCalled();
    },
  );

  it.each([
    'ACCEPT_OPTIONAL',
    'REJECT_OPTIONAL',
    'ACCEPT_ANALYTICS',
    'ACCEPT_REPLAY',
  ])('persists %s with version and secure cookie flags', async (choice) => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(await saveCookieConsent(choice)).toEqual({ ok: true });
    expect(mocks.rateLimit).toHaveBeenCalledWith('cookieConsent', 'user-1');
    expect(mocks.consentCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        consentVersion: COOKIE_CONSENT_VERSION,
        choice,
      },
    });
    expect(mocks.set).toHaveBeenCalledWith(
      COOKIE_CONSENT_COOKIE,
      `${COOKIE_CONSENT_VERSION}:${choice}`,
      {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 31536000,
      },
    );
    expect(mocks.consentCreate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.set.mock.invocationCallOrder[0],
    );
  });

  it('supports anonymous local preferences without a secure-only cookie', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mocks.userId.mockResolvedValue(null);
    expect(await saveCookieConsent('REJECT_OPTIONAL')).toEqual({ ok: true });
    expect(mocks.consentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
    expect(mocks.set).toHaveBeenCalledWith(
      COOKIE_CONSENT_COOKIE,
      expect.any(String),
      expect.objectContaining({ secure: false }),
    );
  });

  it('does not set cookies if rate-limited', async () => {
    mocks.rateLimit.mockResolvedValue({ ok: false, message: 'Limit' });
    expect(await saveCookieConsent('REJECT_OPTIONAL')).toEqual({
      ok: false,
      message: 'Limit',
    });
    expect(mocks.consentCreate).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it.each(['session', 'limit', 'database', 'cookieStore', 'cookieWrite'])(
    'logs failure at %s and reports it',
    async (stage) => {
      const error = new Error(stage);
      if (stage === 'session') mocks.userId.mockRejectedValue(error);
      if (stage === 'limit') mocks.rateLimit.mockRejectedValue(error);
      if (stage === 'database') mocks.consentCreate.mockRejectedValue(error);
      if (stage === 'cookieStore') mocks.cookies.mockRejectedValue(error);
      if (stage === 'cookieWrite')
        mocks.set.mockImplementation(() => {
          throw error;
        });
      expect(await saveCookieConsent('ACCEPT_OPTIONAL')).toEqual({
        ok: false,
        message: 'Nie udało się zapisać wyboru. Spróbuj ponownie.',
      });
      expect(mocks.log).toHaveBeenCalledWith(
        '[cookie-consent] Failed to record cookie preference.',
        error,
      );
      if (stage === 'database') expect(mocks.set).not.toHaveBeenCalled();
    },
  );

  it('clears the consent cookie', async () => {
    expect(await clearCookieConsent()).toEqual({ ok: true });
    expect(mocks.delete).toHaveBeenCalledWith(COOKIE_CONSENT_COOKIE);
    expect(mocks.consentCreate).not.toHaveBeenCalled();
  });

  it('logs and reports cookie deletion failures', async () => {
    const error = new Error('cookie unavailable');
    mocks.delete.mockImplementation(() => {
      throw error;
    });
    expect(await clearCookieConsent()).toEqual({
      ok: false,
      message: 'Nie udało się usunąć zapisanego wyboru. Spróbuj ponownie.',
    });
    expect(mocks.log).toHaveBeenCalledWith(
      '[cookie-consent] Failed to clear cookie preference.',
      error,
    );
  });
});
