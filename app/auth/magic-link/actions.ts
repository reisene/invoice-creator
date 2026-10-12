'use server';

import { auth } from '@/lib/auth/server';
import { authErrorMessage } from '@/lib/authErrors';
import { headers } from 'next/headers';

export async function requestMagicLink(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const email = (formData.get('email') as string)?.trim();

  if (!email) {
    return { error: 'Podaj adres e-mail.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  const origin = (await headers()).get('origin');

  const { error } = await auth.signIn.magicLink({
    email,
    ...(name ? { name } : {}),
    callbackURL: `${origin ?? ''}/`,
  });

  if (error) {
    return { error: authErrorMessage(error, 'Nie udało się wysłać linku.') };
  }

  return { success: true };
}
