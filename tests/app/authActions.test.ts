// @vitest-environment node
import { requestPasswordReset } from '@/app/auth/forgot-password/actions';
import { requestMagicLink } from '@/app/auth/magic-link/actions';
import { resetPassword } from '@/app/auth/reset-password/actions';
import { signInWithEmail } from '@/app/auth/sign-in/actions';
import { signUpWithEmail } from '@/app/auth/sign-up/actions';
import {
  resendVerificationCode,
  verifyEmailCode,
} from '@/app/auth/verify-email/actions';
import { acceptCurrentTerms } from '@/app/terms/accept/actions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    signIn: { email: vi.fn(), magicLink: vi.fn() },
    signUp: { email: vi.fn() },
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    emailOtp: {
      verifyEmail: vi.fn(),
      sendVerificationOtp: vi.fn(),
    },
  },
  headers: vi.fn(),
  recordTerms: vi.fn(),
  hasTerms: vi.fn(),
  log: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/auth/server', () => ({ auth: mocks.auth }));
vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));
vi.mock('@/lib/legal/legalDocuments', () => ({
  getCurrentLegalDocument: () => ({ version: '2026-01' }),
}));
vi.mock('@/lib/legal/recordTermsAcceptance', () => ({
  recordTermsAcceptance: mocks.recordTerms,
  hasCurrentTermsAcceptance: mocks.hasTerms,
}));

function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const user = { id: 'user-1', email: 'jan@example.com', name: 'Jan' };
const consent = {
  email: ' JAN@EXAMPLE.COM ',
  acceptTerms: 'accepted',
  termsVersion: '2026-01',
  name: ' Jan ',
  password: 'password123',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  });
  mocks.auth.getSession.mockResolvedValue({ data: { user }, error: null });
  for (const fn of [
    mocks.auth.signIn.email,
    mocks.auth.signIn.magicLink,
    mocks.auth.signUp.email,
    mocks.auth.requestPasswordReset,
    mocks.auth.resetPassword,
    mocks.auth.emailOtp.verifyEmail,
    mocks.auth.emailOtp.sendVerificationOtp,
  ]) {
    fn.mockResolvedValue({ data: { user }, error: null });
  }
  mocks.headers.mockResolvedValue(
    new Headers({ origin: 'https://example.com' }),
  );
  mocks.hasTerms.mockResolvedValue(false);
});

describe('email sign-in', () => {
  it('passes credentials and redirects through the terms check', async () => {
    await expect(signInWithEmail(null, form(consent))).rejects.toThrow(
      'REDIRECT:/auth/terms-check',
    );
    expect(mocks.auth.signIn.email).toHaveBeenCalledWith({
      email: consent.email,
      password: consent.password,
    });
  });

  it.each([
    { code: 'EMAIL_NOT_VERIFIED' },
    { message: 'Email verification required' },
  ])('redirects unverified accounts: %j', async (error) => {
    mocks.auth.signIn.email.mockResolvedValue({ error });
    await expect(signInWithEmail(null, form(consent))).rejects.toThrow(
      `REDIRECT:/auth/verify-email?email=${encodeURIComponent(consent.email)}`,
    );
  });

  it.each([
    [
      { code: 'INVALID_EMAIL_OR_PASSWORD' },
      'Nieprawidłowy adres e-mail lub hasło.',
    ],
    [{ code: 'UNKNOWN' }, 'Nie udało się zalogować. Spróbuj ponownie.'],
  ])('returns a safe authentication error: %j', async (error, message) => {
    mocks.auth.signIn.email.mockResolvedValue({ error });
    expect(await signInWithEmail(null, form(consent))).toEqual({
      error: message,
    });
  });
});

describe('password reset', () => {
  it.each([undefined, '', '   ', new File(['x'], 'email.txt')])(
    'rejects missing or non-text email: %s',
    async (email) => {
      const data = form();
      if (email !== undefined) data.set('email', email);
      expect(await requestPasswordReset(null, data)).toEqual({
        error: 'Podaj adres e-mail.',
      });
      expect(mocks.auth.requestPasswordReset).not.toHaveBeenCalled();
    },
  );

  it.each(['https://example.com', null])('uses origin %s', async (origin) => {
    mocks.headers.mockResolvedValue(
      new Headers(origin ? { origin } : undefined),
    );
    expect(
      await requestPasswordReset(null, form({ email: ' jan@example.com ' })),
    ).toEqual({ success: true });
    expect(mocks.auth.requestPasswordReset).toHaveBeenCalledWith({
      email: user.email,
      redirectTo: `${origin ?? ''}/auth/reset-password`,
    });
  });

  it('reports a reset request error', async () => {
    mocks.auth.requestPasswordReset.mockResolvedValue({
      error: { status: 429 },
    });
    expect(await requestPasswordReset(null, form(consent))).toEqual({
      error: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
    });
  });

  it('rejects missing token and mismatching passwords before auth', async () => {
    expect(await resetPassword(null, form())).toEqual({
      error: 'Link jest nieprawidłowy lub wygasł.',
    });
    expect(
      await resetPassword(
        null,
        form({ token: 'token', password: 'a', confirm: 'b' }),
      ),
    ).toEqual({ error: 'Hasła nie są takie same.' });
    expect(mocks.auth.resetPassword).not.toHaveBeenCalled();
  });

  it('reports invalid tokens and redirects only after success', async () => {
    const data = form({
      token: 'token',
      password: 'new-pass',
      confirm: 'new-pass',
    });
    mocks.auth.resetPassword.mockResolvedValueOnce({
      error: { code: 'INVALID_TOKEN' },
    });
    expect(await resetPassword(null, data)).toEqual({
      error: 'Link jest nieprawidłowy lub wygasł.',
    });
    await expect(resetPassword(null, data)).rejects.toThrow(
      'REDIRECT:/auth/sign-in?reset=1',
    );
    expect(mocks.auth.resetPassword).toHaveBeenLastCalledWith({
      token: 'token',
      newPassword: 'new-pass',
    });
  });
});

describe('registration', () => {
  it.each([
    [{ acceptTerms: '' }, 'Zaakceptuj Regulamin'],
    [{ termsVersion: 'old' }, 'Wersja Regulaminu'],
    [{ email: '' }, 'Podaj adres e-mail.'],
    [{ name: ' ' }, 'Podaj imię i nazwisko.'],
    [{ password: '' }, 'Podaj hasło.'],
  ])('rejects invalid registration %j', async (overrides, error) => {
    expect(
      await signUpWithEmail(null, form({ ...consent, ...overrides })),
    ).toEqual({ error: expect.stringContaining(error) });
    expect(mocks.auth.signUp.email).not.toHaveBeenCalled();
  });

  it.each(['name', 'password'])('rejects a file in %s', async (field) => {
    const data = form(consent);
    data.set(field, new File(['x'], 'x'));
    expect(await signUpWithEmail(null, data)).toEqual({
      error: expect.any(String),
    });
    expect(mocks.auth.signUp.email).not.toHaveBeenCalled();
  });

  it('reports auth errors without recording consent', async () => {
    mocks.auth.signUp.email.mockResolvedValue({
      error: { code: 'USER_ALREADY_EXISTS' },
    });
    expect(await signUpWithEmail(null, form(consent))).toEqual({
      error: 'Konto z tym adresem e-mail już istnieje.',
    });
    expect(mocks.recordTerms).not.toHaveBeenCalled();
  });

  it('normalizes registration and records explicit consent', async () => {
    await expect(
      signUpWithEmail(
        null,
        form({
          ...consent,
          requestImmediateStart: 'requested',
        }),
      ),
    ).rejects.toThrow('REDIRECT:/auth/verify-email?email=jan%40example.com');
    expect(mocks.auth.signUp.email).toHaveBeenCalledWith({
      email: user.email,
      name: 'Jan',
      password: consent.password,
    });
    expect(mocks.recordTerms).toHaveBeenCalledWith(
      {
        email: user.email,
        termsVersion: '2026-01',
        registrationMethod: 'EMAIL_PASSWORD',
        earlyServiceStartRequested: true,
      },
      user.id,
    );
  });

  it.each([null, {}, { user: {} }])(
    'logs a missing auth user: %j',
    async (data) => {
      mocks.auth.signUp.email.mockResolvedValue({ data, error: null });
      await expect(signUpWithEmail(null, form(consent))).rejects.toThrow(
        'REDIRECT:',
      );
      expect(mocks.log).toHaveBeenCalledWith(
        'Rejestracja zakończyła się bez identyfikatora użytkownika.',
        expect.any(Error),
      );
      expect(mocks.recordTerms).not.toHaveBeenCalled();
    },
  );

  it('logs failed consent storage while preserving verification redirect', async () => {
    const error = new Error('db unavailable');
    mocks.recordTerms.mockRejectedValue(error);
    await expect(signUpWithEmail(null, form(consent))).rejects.toThrow(
      'REDIRECT:',
    );
    expect(mocks.log).toHaveBeenCalledWith(expect.any(String), error);
  });
});

describe('magic links', () => {
  it.each([undefined, '', 'invalid'])(
    'rejects invalid mode %s',
    async (mode) => {
      expect(
        await requestMagicLink(null, form(mode === undefined ? {} : { mode })),
      ).toEqual({ error: 'Nieprawidłowy tryb logowania.' });
      expect(mocks.auth.signIn.magicLink).not.toHaveBeenCalled();
    },
  );

  it('requires consent for signup', async () => {
    expect(await requestMagicLink(null, form({ mode: 'signup' }))).toEqual({
      error: expect.stringContaining('Zaakceptuj Regulamin'),
    });
    expect(mocks.auth.signIn.magicLink).not.toHaveBeenCalled();
  });

  it.each([undefined, '', ' ', new File(['x'], 'x')])(
    'rejects empty email %s',
    async (email) => {
      const data = form({ mode: 'signin' });
      if (email !== undefined) data.set('email', email);
      expect(await requestMagicLink(null, data)).toEqual({
        error: 'Podaj adres e-mail.',
      });
    },
  );

  it.each([true, false])(
    'signs in without signup consent, origin=%s',
    async (withOrigin) => {
      mocks.headers.mockResolvedValue(
        new Headers(withOrigin ? { origin: 'https://example.com' } : {}),
      );
      expect(
        await requestMagicLink(
          null,
          form({ mode: 'signin', email: ' jan@example.com ' }),
        ),
      ).toEqual({ success: true });
      expect(mocks.auth.signIn.magicLink).toHaveBeenCalledWith({
        email: user.email,
        callbackURL: `${withOrigin ? 'https://example.com' : ''}/auth/terms-check`,
      });
      expect(mocks.recordTerms).not.toHaveBeenCalled();
    },
  );

  it('records pending signup consent and includes a supplied name', async () => {
    expect(
      await requestMagicLink(null, form({ ...consent, mode: 'signup' })),
    ).toEqual({ success: true });
    expect(mocks.auth.signIn.magicLink).toHaveBeenCalledWith({
      email: user.email,
      name: 'Jan',
      callbackURL: 'https://example.com/auth/terms-check',
    });
    expect(mocks.recordTerms).toHaveBeenCalledWith({
      email: user.email,
      termsVersion: '2026-01',
      registrationMethod: 'MAGIC_LINK',
      earlyServiceStartRequested: false,
    });
  });

  it('does not record consent if sending fails', async () => {
    mocks.auth.signIn.magicLink.mockResolvedValue({ error: { status: 429 } });
    expect(
      await requestMagicLink(null, form({ ...consent, mode: 'signup' })),
    ).toEqual({ error: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.' });
    expect(mocks.recordTerms).not.toHaveBeenCalled();
  });

  it('reports and logs failed pending-consent storage', async () => {
    mocks.recordTerms.mockRejectedValue(new Error('db'));
    expect(
      await requestMagicLink(null, form({ ...consent, mode: 'signup' })),
    ).toEqual({ error: expect.stringContaining('Link został wysłany') });
    expect(mocks.log).toHaveBeenCalled();
  });
});

describe('verification codes', () => {
  it.each<Record<string, string>>([
    {},
    { email: user.email },
    { otp: '123456' },
  ])('requires email and OTP: %j', async (data) => {
    expect(await verifyEmailCode(null, form(data))).toEqual({
      ok: false,
      message: 'Podaj adres e-mail i kod.',
    });
    expect(mocks.auth.emailOtp.verifyEmail).not.toHaveBeenCalled();
  });

  it('normalizes email and trims OTP', async () => {
    expect(
      await verifyEmailCode(
        null,
        form({ email: consent.email, otp: ' 123456 ' }),
      ),
    ).toEqual({ ok: true, message: expect.stringContaining('zweryfikowany') });
    expect(mocks.auth.emailOtp.verifyEmail).toHaveBeenCalledWith({
      email: user.email,
      otp: '123456',
    });
  });

  it('reports code verification errors', async () => {
    mocks.auth.emailOtp.verifyEmail.mockResolvedValue({
      error: { code: 'INVALID_OTP' },
    });
    expect(
      await verifyEmailCode(null, form({ email: user.email, otp: '123456' })),
    ).toEqual({ ok: false, message: 'Kod jest nieprawidłowy lub wygasł.' });
  });

  it('requires email before resending', async () => {
    expect(await resendVerificationCode(null, form())).toEqual({
      ok: false,
      message: 'Podaj adres e-mail.',
    });
    expect(mocks.auth.emailOtp.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it('resends without revealing whether the account exists', async () => {
    expect(await resendVerificationCode(null, form(consent))).toEqual({
      ok: true,
      message: 'Jeśli konto istnieje, wysłaliśmy nowy kod.',
    });
    expect(mocks.auth.emailOtp.sendVerificationOtp).toHaveBeenCalledWith({
      email: user.email,
      type: 'email-verification',
    });
  });

  it('reports resend errors', async () => {
    mocks.auth.emailOtp.sendVerificationOtp.mockResolvedValue({
      error: { code: 'UNKNOWN' },
    });
    expect(await resendVerificationCode(null, form(consent))).toEqual({
      ok: false,
      message: 'Nie udało się wysłać kodu. Spróbuj za chwilę.',
    });
  });
});

describe('terms reconsent', () => {
  it.each([{ acceptTerms: '' }, { termsVersion: 'old' }])(
    'validates consent before session lookup %j',
    async (overrides) => {
      expect(
        await acceptCurrentTerms(null, form({ ...consent, ...overrides })),
      ).toEqual({ error: expect.any(String) });
      expect(mocks.auth.getSession).not.toHaveBeenCalled();
    },
  );

  it.each([null, { user: {} }, { user: { id: user.id } }])(
    'requires an authenticated user with email: %j',
    async (data) => {
      mocks.auth.getSession.mockResolvedValue({ data });
      await expect(acceptCurrentTerms(null, form(consent))).rejects.toThrow(
        'REDIRECT:/auth/sign-in',
      );
    },
  );

  it('does not record duplicate consent', async () => {
    mocks.hasTerms.mockResolvedValue(true);
    await expect(acceptCurrentTerms(null, form(consent))).rejects.toThrow(
      'REDIRECT:/',
    );
    expect(mocks.recordTerms).not.toHaveBeenCalled();
  });

  it('records account reconsent then redirects', async () => {
    await expect(acceptCurrentTerms(null, form(consent))).rejects.toThrow(
      'REDIRECT:/',
    );
    expect(mocks.recordTerms).toHaveBeenCalledWith(
      {
        email: user.email,
        termsVersion: '2026-01',
        registrationMethod: 'ACCOUNT_RECONSENT',
        earlyServiceStartRequested: false,
      },
      user.id,
    );
  });

  it('does not redirect on failed storage', async () => {
    mocks.recordTerms.mockRejectedValue(new Error('db'));
    expect(await acceptCurrentTerms(null, form(consent))).toEqual({
      error: 'Nie udało się zapisać akceptacji Regulaminu. Spróbuj ponownie.',
    });
    expect(mocks.log).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
