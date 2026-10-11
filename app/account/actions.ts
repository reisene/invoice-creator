'use server';

import { auth } from '@/lib/auth/server';
import { authErrorMessage } from '@/lib/authErrors';
import { getCurrentUserId } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import { getInvoiceNumberScope } from '@/lib/invoiceNumbering';
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
  const userId = await getCurrentUserId();
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
  const userId = await getCurrentUserId();
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
  if (!(await getCurrentUserId())) return { ok: false, message: NOT_SIGNED_IN };

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
  if (!(await getCurrentUserId())) return { ok: false, message: NOT_SIGNED_IN };

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
  if (!(await getCurrentUserId())) return { ok: false, message: NOT_SIGNED_IN };

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
  if (!(await getCurrentUserId())) return { ok: false, message: NOT_SIGNED_IN };

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

export async function revokeSessionById(formData: FormData) {
  if (!(await getCurrentUserId())) return;

  const id = String(formData.get('id') ?? '');
  const { data: sessions } = await auth.listSessions();
  const target = sessions?.find((item) => item.id === id);
  if (!target) return;

  await auth.revokeSession({ token: target.token });
  revalidatePath('/account');
}

export async function revokeOtherSessions() {
  if (!(await getCurrentUserId())) return;

  await auth.revokeOtherSessions();
  revalidatePath('/account');
}

export async function revokeAllSessions() {
  if (!(await getCurrentUserId())) return;

  await auth.revokeSessions();
  redirect('/auth/sign-in');
}
export async function deleteAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, message: NOT_SIGNED_IN };

  if (formData.get('confirm') !== 'on') {
    return { ok: false, message: 'Potwierdź, że rozumiesz skutki usunięcia.' };
  }
  const password = String(formData.get('password') ?? '');
  if (!password) return { ok: false, message: 'Podaj hasło.' };

  const { data: session } = await auth.getSession();
  const email = session?.user?.email;
  if (!email) return { ok: false, message: NOT_SIGNED_IN };

  // Verify the password before touching any data.
  const { error: passwordError } = await auth.signIn.email({ email, password });
  if (passwordError) {
    return {
      ok: false,
      message: authErrorMessage(passwordError, 'Nieprawidłowe hasło.'),
    };
  }

  // Data goes first: if this fails the account still exists and the user can retry.
  try {
    await prisma.$transaction([
      prisma.invoice.deleteMany({ where: { userId } }),
      prisma.savedParty.deleteMany({ where: { userId } }),
      prisma.userBankAccount.deleteMany({ where: { userId } }),
      prisma.invoiceSequence.deleteMany({
        where: { scope: getInvoiceNumberScope(userId) },
      }),
    ]);
  } catch {
    return {
      ok: false,
      message:
        'Nie udało się skasować zapisanych danych. Konto nie zostało usunięte, spróbuj ponownie.',
    };
  }

  const { error } = await auth.deleteUser({ password });
  if (error) {
    return {
      ok: false,
      message:
        'Dane zostały usunięte, ale nie udało się usunąć konta. Spróbuj ponownie.',
    };
  }
  redirect('/');
}
