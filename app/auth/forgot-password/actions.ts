'use server';

import { auth } from '@/lib/auth/server';
import { headers } from 'next/headers';

export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const email = (formData.get('email') as string)?.trim();

  if (!email) {
    return { error: 'Podaj adres e-mail.' };
  }

  const origin = (await headers()).get('origin');

  const { error } = await auth.requestPasswordReset({
    email,
    redirectTo: `${origin ?? ''}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message || 'Nie udało się wysłać wiadomości.' };
  }

  return { success: true };
}
