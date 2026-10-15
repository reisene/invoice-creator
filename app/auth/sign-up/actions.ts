'use server';

import { logServerError } from '@/lib/serverLogger';

import { auth } from '@/lib/auth/server';
import { authErrorMessage } from '@/lib/authErrors';
import { getCurrentLegalDocument } from '@/lib/legalDocuments';
import { recordTermsAcceptance } from '@/lib/recordTermsAcceptance';
import { parseRegistrationConsent } from '@/lib/termsAcceptance';
import { redirect } from 'next/navigation';

export async function signUpWithEmail(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const parsedConsent = parseRegistrationConsent(
    formData,
    'EMAIL_PASSWORD',
    getCurrentLegalDocument('terms').version,
  );
  if ('error' in parsedConsent) {
    return parsedConsent;
  }

  const name = formData.get('name');
  const password = formData.get('password');
  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Podaj imię i nazwisko.' };
  }
  if (typeof password !== 'string' || !password) {
    return { error: 'Podaj hasło.' };
  }

  const { data, error } = await auth.signUp.email({
    email: parsedConsent.consent.email,
    name: name.trim(),
    password,
  });

  if (error) {
    return { error: authErrorMessage(error, 'Nie udało się utworzyć konta.') };
  }

  if (data?.user?.id) {
    try {
      await recordTermsAcceptance(parsedConsent.consent, data.user.id);
    } catch (error) {
      logServerError('Nie udało się zapisać akceptacji Regulaminu.', error);
      redirect(
        `/auth/verify-email?email=${encodeURIComponent(parsedConsent.consent.email)}`,
      );
    }
  } else {
    console.error('Rejestracja zakończyła się bez identyfikatora użytkownika.');
  }

  redirect(
    `/auth/verify-email?email=${encodeURIComponent(parsedConsent.consent.email)}`,
  );
}
