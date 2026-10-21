'use server';

import { logServerError } from '@/lib/serverLogger';

import { auth } from '@/lib/auth/server';
import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import {
  hasCurrentTermsAcceptance,
  recordTermsAcceptance,
} from '@/lib/legal/recordTermsAcceptance';
import { redirect } from 'next/navigation';

export type AcceptTermsState = { error: string } | null;

export async function acceptCurrentTerms(
  _prevState: AcceptTermsState,
  formData: FormData,
): Promise<AcceptTermsState> {
  const currentTermsVersion = getCurrentLegalDocument('terms').version;
  if (formData.get('acceptTerms') !== 'accepted') {
    return { error: 'Zaakceptuj Regulamin, aby kontynuować.' };
  }
  if (formData.get('termsVersion') !== currentTermsVersion) {
    return {
      error:
        'Wersja Regulaminu uległa zmianie. Odśwież stronę i zapoznaj się z aktualnym dokumentem.',
    };
  }

  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.id || !user.email) {
    redirect('/auth/sign-in');
  }

  if (await hasCurrentTermsAcceptance(user.id)) {
    redirect('/');
  }

  try {
    await recordTermsAcceptance(
      {
        email: user.email,
        termsVersion: currentTermsVersion,
        registrationMethod: 'ACCOUNT_RECONSENT',
        earlyServiceStartRequested: false,
      },
      user.id,
    );
  } catch (error) {
    logServerError('Nie udało się zapisać akceptacji Regulaminu.', error);
    return {
      error: 'Nie udało się zapisać akceptacji Regulaminu. Spróbuj ponownie.',
    };
  }

  redirect('/');
}
