'use server';

import { auth } from '@/lib/auth/server';
import { authErrorMessage } from '@/lib/authErrors';
import { redirect } from 'next/navigation';

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const email = formData.get('email') as string;
  const { error } = await auth.signIn.email({
    email,
    password: formData.get('password') as string,
  });

  if (error) {
    if (
      error.code === 'EMAIL_NOT_VERIFIED' ||
      /verif/i.test(error.message ?? '')
    ) {
      redirect(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    }
    return {
      error: authErrorMessage(
        error,
        'Nie udało się zalogować. Spróbuj ponownie.',
      ),
    };
  }

  redirect('/');
}
