'use server';

import { logServerError } from '@/lib/serverLogger';

import { auth } from '@/lib/auth/server';
import { authErrorMessage } from '@/lib/authErrors';
import { getCurrentUserId, getCurrentUserIdWithTerms } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import { getInvoiceNumberScope } from '@/lib/invoiceNumbering';
import { checkRateLimit } from '@/lib/rateLimit';
import { encryptText } from '@/lib/savedDataCrypto';
import { isValidPolishBankAccount } from '@/lib/validateInvoiceForm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type AccountFormState = { ok: boolean; message: string } | null;

const NOT_SIGNED_IN = 'Zaloguj się, aby edytować konto.';

export async function saveBankAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, message: NOT_SIGNED_IN };

  const accountHolder = String(formData.get('accountHolder') ?? '').trim();
  const bankName = String(formData.get('bankName') ?? '').trim();
  const accountNumber = String(formData.get('accountNumber') ?? '')
    .replace(/[\s-]/g, '')
    .toUpperCase();

  if (!accountHolder || accountHolder.length > 200) {
    return { ok: false, message: 'Podaj nazwę właściciela rachunku.' };
  }
  if (!bankName || bankName.length > 100) {
    return { ok: false, message: 'Podaj nazwę banku.' };
  }
  if (!isValidPolishBankAccount(accountNumber)) {
    return {
      ok: false,
      message: 'Podaj prawidłowy polski numer rachunku bankowego.',
    };
  }

  await prisma.userBankAccount.upsert({
    where: { userId },
    create: {
      userId,
      accountHolder: encryptText(accountHolder),
      bankName: encryptText(bankName),
      accountNumber: encryptText(accountNumber),
    },
    update: {
      accountHolder: encryptText(accountHolder),
      bankName: encryptText(bankName),
      accountNumber: encryptText(accountNumber),
    },
  });
  revalidatePath('/account');
  revalidatePath('/generator');
  return { ok: true, message: 'Dane rachunku bankowego zapisane.' };
}

export async function deleteBankAccount(): Promise<{
  ok: boolean;
  message: string;
}> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, message: NOT_SIGNED_IN };
  await prisma.userBankAccount.deleteMany({ where: { userId } });
  revalidatePath('/account');
  revalidatePath('/generator');
  return { ok: true, message: 'Zapisany rachunek bankowy usunięty.' };
}

export async function updateProfile(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  if (!(await getCurrentUserIdWithTerms())) {
    return { ok: false, message: NOT_SIGNED_IN };
  }

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 1 || name.length > 100) {
    return { ok: false, message: 'Imię i nazwisko musi mieć 1–100 znaków.' };
  }

  const { error } = await auth.updateUser({ name });
  if (error) {
    return {
      ok: false,
      message: authErrorMessage(error, 'Nie udało się zapisać zmian.'),
    };
  }

  revalidatePath('/account');
  return { ok: true, message: 'Dane zapisane.' };
}

export async function changePassword(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, message: NOT_SIGNED_IN };
  const limit = await checkRateLimit('accountSensitive', userId);
  if (!limit.ok) return { ok: false, message: limit.message };

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!currentPassword) {
    return { ok: false, message: 'Podaj obecne hasło.' };
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false, message: 'Nowe hasło musi mieć 8–128 znaków.' };
  }
  if (newPassword !== confirm) {
    return { ok: false, message: 'Hasła nie są takie same.' };
  }

  const { error } = await auth.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions: true,
  });
  if (error) {
    return {
      ok: false,
      message: authErrorMessage(error, 'Nie udało się zmienić hasła.'),
    };
  }

  return {
    ok: true,
    message: 'Hasło zmienione. Inne sesje zostały wylogowane.',
  };
}

export async function requestEmailChange(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, message: NOT_SIGNED_IN };
  const limit = await checkRateLimit('accountSensitive', userId);
  if (!limit.ok) return { ok: false, message: limit.message };

  const newEmail = String(formData.get('newEmail') ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.length > 254) {
    return { ok: false, message: 'Podaj poprawny adres e-mail.' };
  }

  const { error } = await auth.emailOtp.requestEmailChange({ newEmail });
  if (error) {
    return {
      ok: false,
      message: authErrorMessage(
        error,
        'Nie udało się wysłać kodu. Spróbuj za chwilę.',
      ),
    };
  }
  return {
    ok: true,
    message: `Wysłaliśmy kod na adres ${newEmail}. Wpisz go poniżej.`,
  };
}

export async function confirmEmailChange(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, message: NOT_SIGNED_IN };
  const limit = await checkRateLimit('accountSensitive', userId);
  if (!limit.ok) return { ok: false, message: limit.message };

  const newEmail = String(formData.get('newEmail') ?? '')
    .trim()
    .toLowerCase();
  const otp = String(formData.get('otp') ?? '').trim();
  if (!newEmail || !otp) {
    return { ok: false, message: 'Podaj nowy adres e-mail i kod.' };
  }

  const { error } = await auth.emailOtp.changeEmail({ newEmail, otp });
  if (error) {
    return {
      ok: false,
      message: authErrorMessage(
        error,
        'Kod jest nieprawidłowy lub wygasł. Wyślij nowy kod.',
      ),
    };
  }

  revalidatePath('/account');
  return { ok: true, message: 'Adres e-mail został zmieniony.' };
}

export async function revokeSessionById(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  if (!(await getCurrentUserIdWithTerms())) {
    return { ok: false, message: NOT_SIGNED_IN };
  }
  if (typeof id !== 'string' || id.length === 0 || id.length > 200) {
    return { ok: false, message: 'Nieprawidłowy identyfikator sesji.' };
  }

  const { data: sessions } = await auth.listSessions();
  const target = sessions?.find((item) => item.id === id);
  if (!target) {
    return { ok: false, message: 'Nie znaleziono sesji. Odśwież stronę.' };
  }

  const { error } = await auth.revokeSession({ token: target.token });
  if (error) {
    return {
      ok: false,
      message: authErrorMessage(error, 'Nie udało się wylogować sesji.'),
    };
  }
  revalidatePath('/account');
  return { ok: true, message: 'Sesja została wylogowana.' };
}

export async function revokeOtherSessions(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!(await getCurrentUserIdWithTerms())) {
    return { ok: false, message: NOT_SIGNED_IN };
  }

  const { error } = await auth.revokeOtherSessions();
  if (error) {
    return {
      ok: false,
      message: authErrorMessage(
        error,
        'Nie udało się wylogować z pozostałych urządzeń.',
      ),
    };
  }
  revalidatePath('/account');
  return { ok: true, message: 'Wylogowano z pozostałych urządzeń.' };
}

export async function revokeAllSessions(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!(await getCurrentUserIdWithTerms())) {
    return { ok: false, message: NOT_SIGNED_IN };
  }

  const { error } = await auth.revokeSessions();
  if (error) {
    return {
      ok: false,
      message: authErrorMessage(
        error,
        'Nie udało się wylogować ze wszystkich urządzeń.',
      ),
    };
  }
  redirect('/auth/sign-in');
}

export async function requestAccountDeletionCode(): Promise<AccountFormState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, message: NOT_SIGNED_IN };
  const limit = await checkRateLimit('accountSensitive', session.user.id);
  if (!limit.ok) return { ok: false, message: limit.message };

  const { error } = await auth.emailOtp.sendVerificationOtp({
    email: session.user.email,
    type: 'sign-in',
  });
  if (error) {
    return {
      ok: false,
      message: authErrorMessage(error, 'Nie udało się wysłać kodu.'),
    };
  }
  return { ok: true, message: 'Kod wysłano na adres e-mail Twojego konta.' };
}

export async function deleteAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, message: NOT_SIGNED_IN };
  const limit = await checkRateLimit('accountSensitive', userId);
  if (!limit.ok) return { ok: false, message: limit.message };

  if (formData.get('confirm') !== 'on') {
    return { ok: false, message: 'Potwierdź, że rozumiesz skutki usunięcia.' };
  }
  const password = String(formData.get('password') ?? '');
  const method = formData.get('method');
  const otp = String(formData.get('otp') ?? '').trim();
  if (method !== 'password' && method !== 'email-code') {
    return { ok: false, message: 'Wybierz sposób potwierdzenia tożsamości.' };
  }
  if (method === 'password' && !password) {
    return { ok: false, message: 'Podaj hasło.' };
  }
  if (method === 'email-code' && !/^\d{6}$/.test(otp)) {
    return { ok: false, message: 'Podaj sześciocyfrowy kod z wiadomości.' };
  }

  const { data: session } = await auth.getSession();
  const email = session?.user?.email;
  if (!email) return { ok: false, message: NOT_SIGNED_IN };

  // Reauthenticate the same account before touching any application data.
  const verification =
    method === 'password'
      ? await auth.signIn.email({ email, password })
      : await auth.signIn.emailOtp({ email, otp });
  if (verification.error) {
    return {
      ok: false,
      message: authErrorMessage(
        verification.error,
        'Nie udało się potwierdzić tożsamości.',
      ),
    };
  }
  if (verification.data?.user.id !== userId) {
    console.error('[account/delete] Reauthentication account mismatch.');
    return {
      ok: false,
      message: 'Nie udało się potwierdzić tożsamości konta.',
    };
  }

  // Data goes first: if this fails, the account still exists and the user can retry.
  const acceptanceOwner = {
    OR: [{ userId }, { userId: null, email: email.trim().toLowerCase() }],
  };
  try {
    await prisma.$transaction([
      prisma.invoice.deleteMany({ where: { userId } }),
      prisma.savedParty.deleteMany({ where: { userId } }),
      prisma.userBankAccount.deleteMany({ where: { userId } }),
      prisma.cookieConsent.deleteMany({ where: { userId } }),
      prisma.termsAcceptance.deleteMany({
        where: { ...acceptanceOwner, retainedForDispute: false },
      }),
      prisma.termsAcceptance.updateMany({
        where: {
          ...acceptanceOwner,
          retainedForDispute: true,
          accountDeletionRequestedAt: null,
        },
        data: { accountDeletionRequestedAt: new Date() },
      }),
      prisma.invoiceSequence.deleteMany({
        where: { scope: getInvoiceNumberScope(userId) },
      }),
    ]);
  } catch (error) {
    logServerError(
      '[account/delete] Failed to delete application data.',
      error,
    );
    return {
      ok: false,
      message:
        'Nie udało się skasować zapisanych danych. Konto nie zostało usunięte, spróbuj ponownie.',
    };
  }

  const { data, error } = await auth.deleteUser(
    method === 'password' ? { password } : {},
  );
  if (error) {
    return {
      ok: false,
      message:
        'Dane zostały usunięte, ale nie udało się usunąć konta. Spróbuj ponownie.',
    };
  }
  if (data?.message !== 'User deleted') {
    return {
      ok: false,
      message:
        'Dane aplikacji zostały usunięte. Usunięcie konta wymaga dodatkowego potwierdzenia — sprawdź pocztę e-mail.',
    };
  }
  redirect('/');
}
