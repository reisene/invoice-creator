'use server';

import { logServerError } from '@/lib/serverLogger';

import { auth } from '@/lib/auth/server';
import { authErrorMessage } from '@/lib/authErrors';
import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import { recordTermsAcceptance } from '@/lib/legal/recordTermsAcceptance';
import { parseRegistrationConsent } from '@/lib/legal/termsAcceptance';
import { headers } from 'next/headers';

type MagicLinkActionState =
  { error: string; success?: never } | { success: true; error?: never } | null;

export async function requestMagicLink(
  _prevState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  const mode = formData.get('mode');
  if (mode !== 'signup' && mode !== 'signin') {
    return { error: 'Nieprawidłowy tryb logowania.' };
  }

  const registrationConsent =
    mode === 'signup'
      ? parseRegistrationConsent(
          formData,
          'MAGIC_LINK',
          getCurrentLegalDocument('terms').version,
        )
      : null;
  if (registrationConsent && 'error' in registrationConsent) {
    return registrationConsent;
  }

  const emailField = formData.get('email');
  const email = registrationConsent
    ? registrationConsent.consent.email
    : typeof emailField === 'string'
      ? emailField.trim()
      : '';
  if (!email) {
    return { error: 'Podaj adres e-mail.' };
  }

  const nameField = formData.get('name');
  const name = typeof nameField === 'string' ? nameField.trim() : '';
  const origin = (await headers()).get('origin');

  const { error } = await auth.signIn.magicLink({
    email,
    ...(name ? { name } : {}),
    callbackURL: `${origin ?? ''}/auth/terms-check`,
  });

  if (error) {
    return { error: authErrorMessage(error, 'Nie udało się wysłać linku.') };
  }

  if (registrationConsent && 'consent' in registrationConsent) {
    try {
      await recordTermsAcceptance(registrationConsent.consent);
    } catch (error) {
      logServerError(
        'Link logowania wysłano, ale nie udało się zapisać akceptacji Regulaminu.',
        error,
      );
      return {
        error:
          'Link został wysłany, ale nie udało się zapisać akceptacji Regulaminu. Po zalogowaniu poprosimy o jej ponowne potwierdzenie.',
      };
    }
  }

  return { success: true };
}
