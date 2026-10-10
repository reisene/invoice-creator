'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function resetPassword(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const token = formData.get('token') as string;
  const newPassword = formData.get('password') as string;

  if (!token) {
    return { error: 'Link jest nieprawidłowy lub wygasł.' };
  }

  if (newPassword !== formData.get('confirm')) {
    return { error: 'Hasła nie są takie same.' };
  }

  const { error } = await auth.resetPassword({ newPassword, token });

  if (error) {
    return { error: error.message || 'Nie udało się zmienić hasła.' };
  }

  redirect('/auth/sign-in?reset=1');
}
