// @vitest-environment node
import * as actions from '@/app/account/actions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userId: vi.fn(),
  userWithTerms: vi.fn(),
  rateLimit: vi.fn(),
  revalidate: vi.fn(),
  log: vi.fn(),
  encrypt: vi.fn(),
  upsertBank: vi.fn(),
  deleteInvoices: vi.fn(),
  deleteParties: vi.fn(),
  deleteBank: vi.fn(),
  deleteCookies: vi.fn(),
  deleteTerms: vi.fn(),
  updateTerms: vi.fn(),
  deleteSequence: vi.fn(),
  transaction: vi.fn(),
  auth: {
    getSession: vi.fn(),
    updateUser: vi.fn(),
    changePassword: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
    revokeSessions: vi.fn(),
    deleteUser: vi.fn(),
    emailOtp: {
      requestEmailChange: vi.fn(),
      changeEmail: vi.fn(),
      sendVerificationOtp: vi.fn(),
    },
    signIn: { email: vi.fn(), emailOtp: vi.fn() },
  },
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/currentUser', () => ({
  getCurrentUserId: mocks.userId,
  getCurrentUserIdWithTerms: mocks.userWithTerms,
}));
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: mocks.rateLimit }));
vi.mock('@/lib/auth/server', () => ({ auth: mocks.auth }));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));
vi.mock('@/lib/savedDataCrypto', () => ({ encryptText: mocks.encrypt }));
vi.mock('@/lib/invoice/invoiceNumbering', () => ({
  getInvoiceNumberScope: (id: string) => `user:${id}`,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/db', () => ({
  prisma: {
    userBankAccount: { upsert: mocks.upsertBank, deleteMany: mocks.deleteBank },
    invoice: { deleteMany: mocks.deleteInvoices },
    savedParty: { deleteMany: mocks.deleteParties },
    cookieConsent: { deleteMany: mocks.deleteCookies },
    termsAcceptance: {
      deleteMany: mocks.deleteTerms,
      updateMany: mocks.updateTerms,
    },
    invoiceSequence: { deleteMany: mocks.deleteSequence },
    $transaction: mocks.transaction,
  },
}));

const user = { id: 'user-1', email: 'jan@example.com' };
const bank = {
  accountHolder: ' Jan ',
  bankName: ' Bank ',
  accountNumber: 'PL61 1090-1014 0000 0712 1981 2874',
};
const password = {
  currentPassword: 'old-password',
  newPassword: 'new-password',
  confirm: 'new-password',
};
const deletion = { confirm: 'on', method: 'password', password: 'password' };
const notSignedIn = { ok: false, message: 'Zaloguj się, aby edytować konto.' };

function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  });
  mocks.userId.mockResolvedValue(user.id);
  mocks.userWithTerms.mockResolvedValue(user.id);
  mocks.rateLimit.mockResolvedValue({ ok: true });
  mocks.encrypt.mockImplementation((text: string) => `encrypted:${text}`);
  mocks.auth.getSession.mockResolvedValue({ data: { user } });
  for (const fn of [
    mocks.auth.updateUser,
    mocks.auth.changePassword,
    mocks.auth.revokeSession,
    mocks.auth.revokeOtherSessions,
    mocks.auth.revokeSessions,
    ...Object.values(mocks.auth.emailOtp),
  ])
    fn.mockResolvedValue({ error: null });
  mocks.auth.signIn.email.mockResolvedValue({ data: { user }, error: null });
  mocks.auth.signIn.emailOtp.mockResolvedValue({ data: { user }, error: null });
  mocks.auth.listSessions.mockResolvedValue({
    data: [{ id: 'session-1', token: 'private-token' }],
  });
  mocks.auth.deleteUser.mockResolvedValue({
    data: { message: 'User deleted' },
    error: null,
  });
});

afterEach(() => vi.useRealTimers());

describe('account authentication gates', () => {
  it.each([
    ['bank save', () => actions.saveBankAccount(null, form(bank))],
    ['bank delete', () => actions.deleteBankAccount()],
    ['profile', () => actions.updateProfile(null, form({ name: 'Jan' }))],
    ['password', () => actions.changePassword(null, form(password))],
    [
      'email request',
      () =>
        actions.requestEmailChange(null, form({ newEmail: 'new@example.com' })),
    ],
    [
      'email confirmation',
      () =>
        actions.confirmEmailChange(
          null,
          form({ newEmail: 'new@example.com', otp: '123456' }),
        ),
    ],
    ['one session', () => actions.revokeSessionById('session-1')],
    ['other sessions', () => actions.revokeOtherSessions()],
    ['all sessions', () => actions.revokeAllSessions()],
  ] as const)('requires current terms for %s', async (_label, run) => {
    mocks.userWithTerms.mockResolvedValue(null);
    expect(await run()).toEqual(notSignedIn);
    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(mocks.auth.deleteUser).not.toHaveBeenCalled();
  });

  it.each([
    ['password', () => actions.changePassword(null, form(password))],
    ['email request', () => actions.requestEmailChange(null, form())],
    ['email confirmation', () => actions.confirmEmailChange(null, form())],
    ['deletion code', () => actions.requestAccountDeletionCode()],
    ['deletion', () => actions.deleteAccount(null, form(deletion))],
  ] as const)('rate-limits sensitive operation %s', async (_label, run) => {
    mocks.rateLimit.mockResolvedValue({ ok: false, message: 'Limit' });
    expect(await run()).toEqual({ ok: false, message: 'Limit' });
    expect(mocks.rateLimit).toHaveBeenCalledWith('accountSensitive', user.id);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe('bank details and profile', () => {
  it.each([
    { accountHolder: '' },
    { accountHolder: 'x'.repeat(201) },
    { bankName: '' },
    { bankName: 'x'.repeat(101) },
    { accountNumber: '123' },
  ])('rejects invalid bank details %j', async (overrides) => {
    expect(
      await actions.saveBankAccount(null, form({ ...bank, ...overrides })),
    ).toMatchObject({ ok: false, message: expect.any(String) });
    expect(mocks.upsertBank).not.toHaveBeenCalled();
  });

  it('handles absent bank fields', async () => {
    expect(await actions.saveBankAccount(null, form())).toMatchObject({
      ok: false,
    });
  });

  it('normalizes and encrypts bank details for both upsert paths', async () => {
    expect(await actions.saveBankAccount(null, form(bank))).toEqual({
      ok: true,
      message: 'Dane rachunku bankowego zapisane.',
    });
    const values = {
      accountHolder: 'encrypted:Jan',
      bankName: 'encrypted:Bank',
      accountNumber: 'encrypted:PL61109010140000071219812874',
    };
    expect(mocks.upsertBank).toHaveBeenCalledWith({
      where: { userId: user.id },
      create: { userId: user.id, ...values },
      update: values,
    });
    expect(mocks.revalidate.mock.calls).toEqual([['/account'], ['/generator']]);
  });

  it('deletes bank details for the current user only', async () => {
    expect(await actions.deleteBankAccount()).toMatchObject({ ok: true });
    expect(mocks.deleteBank).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
    expect(mocks.revalidate.mock.calls).toEqual([['/account'], ['/generator']]);
  });

  it.each([undefined, '', ' ', 'x'.repeat(101)])(
    'rejects profile name %s',
    async (name) => {
      expect(
        await actions.updateProfile(
          null,
          form(name === undefined ? {} : { name }),
        ),
      ).toEqual({
        ok: false,
        message: 'Imię i nazwisko musi mieć 1–100 znaków.',
      });
      expect(mocks.auth.updateUser).not.toHaveBeenCalled();
    },
  );

  it.each([' J ', 'n'.repeat(100)])(
    'accepts valid profile boundaries and trims %s',
    async (name) => {
      expect(await actions.updateProfile(null, form({ name }))).toEqual({
        ok: true,
        message: 'Dane zapisane.',
      });
      expect(mocks.auth.updateUser).toHaveBeenCalledWith({ name: name.trim() });
      expect(mocks.revalidate).toHaveBeenCalledWith('/account');
    },
  );

  it('returns profile auth errors without revalidation', async () => {
    mocks.auth.updateUser.mockResolvedValue({ error: { status: 429 } });
    expect(
      await actions.updateProfile(null, form({ name: 'Jan' })),
    ).toMatchObject({ ok: false });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe('password and email changes', () => {
  it.each([
    [{ currentPassword: '' }, 'Podaj obecne hasło.'],
    [{ newPassword: 'short' }, 'Nowe hasło musi mieć 8–128 znaków.'],
    [{ newPassword: 'x'.repeat(129) }, 'Nowe hasło musi mieć 8–128 znaków.'],
    [{ confirm: 'different' }, 'Hasła nie są takie same.'],
  ])('validates password changes %j', async (overrides, message) => {
    expect(
      await actions.changePassword(null, form({ ...password, ...overrides })),
    ).toEqual({ ok: false, message });
    expect(mocks.auth.changePassword).not.toHaveBeenCalled();
  });

  it.each([8, 128])(
    'accepts %i-character passwords and revokes other sessions',
    async (length) => {
      const newPassword = 'x'.repeat(length);
      expect(
        await actions.changePassword(
          null,
          form({ ...password, newPassword, confirm: newPassword }),
        ),
      ).toEqual({
        ok: true,
        message: 'Hasło zmienione. Inne sesje zostały wylogowane.',
      });
      expect(mocks.auth.changePassword).toHaveBeenCalledWith({
        currentPassword: password.currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
    },
  );

  it('reports password authentication errors', async () => {
    mocks.auth.changePassword.mockResolvedValue({
      error: { code: 'INVALID_PASSWORD' },
    });
    expect(await actions.changePassword(null, form(password))).toEqual({
      ok: false,
      message: 'Nieprawidłowe hasło.',
    });
  });

  it.each([undefined, '', 'invalid', `${'a'.repeat(250)}@b.co`])(
    'rejects invalid email %s',
    async (newEmail) => {
      expect(
        await actions.requestEmailChange(
          null,
          form(newEmail === undefined ? {} : { newEmail }),
        ),
      ).toEqual({ ok: false, message: 'Podaj poprawny adres e-mail.' });
      expect(mocks.auth.emailOtp.requestEmailChange).not.toHaveBeenCalled();
    },
  );

  it('normalizes a new email and returns the exact address awaiting confirmation', async () => {
    expect(
      await actions.requestEmailChange(
        null,
        form({ newEmail: ' NEW@EXAMPLE.COM ' }),
      ),
    ).toEqual({
      ok: true,
      newEmail: 'new@example.com',
      message: expect.stringContaining('new@example.com'),
    });
    expect(mocks.auth.emailOtp.requestEmailChange).toHaveBeenCalledWith({
      newEmail: 'new@example.com',
    });
  });

  it('reports email change request errors', async () => {
    mocks.auth.emailOtp.requestEmailChange.mockResolvedValue({ error: {} });
    expect(
      await actions.requestEmailChange(
        null,
        form({ newEmail: 'new@example.com' }),
      ),
    ).toEqual({
      ok: false,
      message: 'Nie udało się wysłać kodu. Spróbuj za chwilę.',
    });
  });

  it.each<Record<string, string>>([
    {},
    { newEmail: 'new@example.com' },
    { otp: '123456' },
  ])('requires both email and confirmation code %j', async (values) => {
    expect(await actions.confirmEmailChange(null, form(values))).toEqual({
      ok: false,
      message: 'Podaj nowy adres e-mail i kod.',
    });
    expect(mocks.auth.emailOtp.changeEmail).not.toHaveBeenCalled();
  });

  it('normalizes and confirms an email change then revalidates the account', async () => {
    expect(
      await actions.confirmEmailChange(
        null,
        form({ newEmail: ' NEW@EXAMPLE.COM ', otp: ' 123456 ' }),
      ),
    ).toEqual({ ok: true, message: 'Adres e-mail został zmieniony.' });
    expect(mocks.auth.emailOtp.changeEmail).toHaveBeenCalledWith({
      newEmail: 'new@example.com',
      otp: '123456',
    });
    expect(mocks.revalidate).toHaveBeenCalledWith('/account');
  });

  it('reports confirmation errors without revalidation', async () => {
    mocks.auth.emailOtp.changeEmail.mockResolvedValue({ error: {} });
    expect(
      await actions.confirmEmailChange(
        null,
        form({ newEmail: 'new@example.com', otp: '123456' }),
      ),
    ).toEqual({
      ok: false,
      message: 'Kod jest nieprawidłowy lub wygasł. Wyślij nowy kod.',
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe('session revocation', () => {
  it.each(['', 's'.repeat(201)])(
    'rejects invalid session id %s',
    async (id) => {
      expect(await actions.revokeSessionById(id)).toEqual({
        ok: false,
        message: 'Nieprawidłowy identyfikator sesji.',
      });
      expect(mocks.auth.listSessions).not.toHaveBeenCalled();
    },
  );

  it.each([null, []])(
    'does not revoke a session not owned by the user: %j',
    async (data) => {
      mocks.auth.listSessions.mockResolvedValue({ data });
      expect(await actions.revokeSessionById('unknown')).toEqual({
        ok: false,
        message: 'Nie znaleziono sesji. Odśwież stronę.',
      });
      expect(mocks.auth.revokeSession).not.toHaveBeenCalled();
    },
  );

  it('looks up the private session token by public id', async () => {
    expect(await actions.revokeSessionById('session-1')).toEqual({
      ok: true,
      message: 'Sesja została wylogowana.',
    });
    expect(mocks.auth.revokeSession).toHaveBeenCalledWith({
      token: 'private-token',
    });
    expect(mocks.revalidate).toHaveBeenCalledWith('/account');
  });

  it('revokes other sessions and refreshes account state', async () => {
    expect(await actions.revokeOtherSessions()).toEqual({
      ok: true,
      message: 'Wylogowano z pozostałych urządzeń.',
    });
    expect(mocks.auth.revokeOtherSessions).toHaveBeenCalledOnce();
    expect(mocks.revalidate).toHaveBeenCalledWith('/account');
  });

  it('redirects only after all sessions have been revoked', async () => {
    await expect(actions.revokeAllSessions()).rejects.toThrow(
      'REDIRECT:/auth/sign-in',
    );
    expect(mocks.auth.revokeSessions).toHaveBeenCalledOnce();
  });

  it.each([
    [
      'one',
      () => actions.revokeSessionById('session-1'),
      mocks.auth.revokeSession,
    ],
    [
      'others',
      () => actions.revokeOtherSessions(),
      mocks.auth.revokeOtherSessions,
    ],
    ['all', () => actions.revokeAllSessions(), mocks.auth.revokeSessions],
  ] as const)('reports %s-session auth errors', async (_label, run, fn) => {
    fn.mockResolvedValue({ error: {} });
    expect(await run()).toMatchObject({
      ok: false,
      message: expect.any(String),
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe('account deletion', () => {
  it('requires a session for the deletion code', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: null });
    expect(await actions.requestAccountDeletionCode()).toEqual(notSignedIn);
    expect(mocks.auth.emailOtp.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it('sends the deletion OTP to the session email only', async () => {
    expect(await actions.requestAccountDeletionCode()).toEqual({
      ok: true,
      message: 'Kod wysłano na adres e-mail Twojego konta.',
    });
    expect(mocks.auth.emailOtp.sendVerificationOtp).toHaveBeenCalledWith({
      email: user.email,
      type: 'sign-in',
    });
  });

  it('reports deletion code errors', async () => {
    mocks.auth.emailOtp.sendVerificationOtp.mockResolvedValue({ error: {} });
    expect(await actions.requestAccountDeletionCode()).toEqual({
      ok: false,
      message: 'Nie udało się wysłać kodu.',
    });
  });

  it('does not require current terms to delete an authenticated account', async () => {
    mocks.userWithTerms.mockResolvedValue(null);
    mocks.userId.mockResolvedValue(null);
    expect(await actions.deleteAccount(null, form(deletion))).toEqual(
      notSignedIn,
    );
    expect(mocks.userWithTerms).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    [{ confirm: '' }, 'Potwierdź'],
    [{ method: 'invalid' }, 'Wybierz sposób'],
    [{ password: '' }, 'Podaj hasło.'],
    [{ method: 'email-code', otp: '123' }, 'sześciocyfrowy'],
  ])('validates deletion confirmation %j', async (overrides, message) => {
    expect(
      await actions.deleteAccount(null, form({ ...deletion, ...overrides })),
    ).toEqual({ ok: false, message: expect.stringContaining(message) });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.auth.deleteUser).not.toHaveBeenCalled();
  });

  it.each([null, { user: {} }])(
    'does not delete without session email %j',
    async (data) => {
      mocks.auth.getSession.mockResolvedValue({ data });
      expect(await actions.deleteAccount(null, form(deletion))).toEqual(
        notSignedIn,
      );
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );

  it('does not touch data after failed reauthentication', async () => {
    mocks.auth.signIn.email.mockResolvedValue({
      error: { code: 'INVALID_PASSWORD' },
    });
    expect(await actions.deleteAccount(null, form(deletion))).toEqual({
      ok: false,
      message: 'Nieprawidłowe hasło.',
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([null, { user: { id: 'different-user' } }])(
    'logs a reauthentication mismatch %j',
    async (data) => {
      mocks.auth.signIn.email.mockResolvedValue({ data });
      expect(await actions.deleteAccount(null, form(deletion))).toEqual({
        ok: false,
        message: 'Nie udało się potwierdzić tożsamości konta.',
      });
      expect(mocks.log).toHaveBeenCalledWith(
        '[account/delete] Reauthentication account mismatch.',
        expect.any(Error),
      );
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );

  it.each(['password', 'email-code'])(
    'deletes only the current user data atomically after %s verification',
    async (method) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-21'));
      await expect(
        actions.deleteAccount(
          null,
          form({ ...deletion, method, otp: ' 123456 ' }),
        ),
      ).rejects.toThrow('REDIRECT:/');
      const verifier =
        method === 'password'
          ? mocks.auth.signIn.email
          : mocks.auth.signIn.emailOtp;
      expect(verifier).toHaveBeenCalledWith(
        method === 'password'
          ? { email: user.email, password: deletion.password }
          : { email: user.email, otp: '123456' },
      );
      for (const fn of [
        mocks.deleteInvoices,
        mocks.deleteParties,
        mocks.deleteBank,
        mocks.deleteCookies,
      ]) {
        expect(fn).toHaveBeenCalledWith({ where: { userId: user.id } });
      }
      const owner = {
        OR: [{ userId: user.id }, { userId: null, email: user.email }],
      };
      expect(mocks.deleteTerms).toHaveBeenCalledWith({
        where: { ...owner, retainedForDispute: false },
      });
      expect(mocks.updateTerms).toHaveBeenCalledWith({
        where: {
          ...owner,
          retainedForDispute: true,
          accountDeletionRequestedAt: null,
        },
        data: { accountDeletionRequestedAt: new Date('2026-10-21') },
      });
      expect(mocks.deleteSequence).toHaveBeenCalledWith({
        where: { scope: `user:${user.id}` },
      });
      expect(mocks.transaction).toHaveBeenCalledOnce();
      expect(mocks.auth.deleteUser).toHaveBeenCalledWith(
        method === 'password' ? { password: deletion.password } : {},
      );
      expect(verifier.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.transaction.mock.invocationCallOrder[0],
      );
      expect(mocks.transaction.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.auth.deleteUser.mock.invocationCallOrder[0],
      );
    },
  );

  it('preserves the auth account if application data deletion fails', async () => {
    const error = new Error('transaction failed');
    mocks.transaction.mockRejectedValue(error);
    expect(await actions.deleteAccount(null, form(deletion))).toEqual({
      ok: false,
      message: expect.stringContaining('Konto nie zostało usunięte'),
    });
    expect(mocks.log).toHaveBeenCalledWith(
      '[account/delete] Failed to delete application data.',
      error,
    );
    expect(mocks.auth.deleteUser).not.toHaveBeenCalled();
  });

  it('reports partial deletion when the auth account could not be deleted', async () => {
    mocks.auth.deleteUser.mockResolvedValue({ error: {} });
    expect(await actions.deleteAccount(null, form(deletion))).toEqual({
      ok: false,
      message:
        'Dane zostały usunięte, ale nie udało się usunąć konta. Spróbuj ponownie.',
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([null, { message: 'Confirmation required' }])(
    'reports additional confirmation instead of success %j',
    async (data) => {
      mocks.auth.deleteUser.mockResolvedValue({ data });
      expect(await actions.deleteAccount(null, form(deletion))).toEqual({
        ok: false,
        message: expect.stringContaining('wymaga dodatkowego potwierdzenia'),
      });
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );
});
