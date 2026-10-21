'use server';

import { auth } from '@/lib/auth/server';
import { authErrorMessage } from '@/lib/authErrors';
import { headers } from 'next/headers';

export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const emailField = formData.get('email');
  const email = typeof emailField === 'string' ? emailField.trim() : '';

  if (!email) {
    return { error: 'Podaj adres e-mail.' };
  }

  const origin = (await headers()).get('origin');

  const { error } = await auth.requestPasswordReset({
    email,
    redirectTo: `${origin ?? ''}/auth/reset-password`,
  });

  if (error) {
    return {
      error: authErrorMessage(error, 'Nie udało się wysłać wiadomości.'),
    };
  }

  return { success: true };
}
