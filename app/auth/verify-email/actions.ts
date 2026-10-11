'use server';

import { auth } from '@/lib/auth/server';

export type VerifyState = { ok: boolean; message: string } | null;

function readEmail(formData: FormData) {
  return String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
}

export async function verifyEmailCode(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const email = readEmail(formData);
  const otp = String(formData.get('otp') ?? '').trim();
  if (!email || !otp) {
    return { ok: false, message: 'Podaj adres e-mail i kod.' };
  }

  const { error } = await auth.emailOtp.verifyEmail({ email, otp });
  if (error) {
    return {
      ok: false,
      message: 'Kod jest nieprawidłowy lub wygasł. Wyślij nowy kod.',
    };
  }
  return {
    ok: true,
    message: 'Adres e-mail zweryfikowany. Możesz się zalogować.',
  };
}

export async function resendVerificationCode(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const email = readEmail(formData);
  if (!email) return { ok: false, message: 'Podaj adres e-mail.' };

  const { error } = await auth.emailOtp.sendVerificationOtp({
    email,
    type: 'email-verification',
  });
  if (error) {
    return {
      ok: false,
      message: 'Nie udało się wysłać kodu. Spróbuj za chwilę.',
    };
  }
  return { ok: true, message: 'Jeśli konto istnieje, wysłaliśmy nowy kod.' };
}
