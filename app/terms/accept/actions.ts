'use server';

import { auth } from '@/lib/auth/server';
import {
  hasCurrentTermsAcceptance,
  recordTermsAcceptance,
} from '@/lib/recordTermsAcceptance';
import { redirect } from 'next/navigation';

export type AcceptTermsState = { error: string } | null;

export async function acceptCurrentTerms(
  _prevState: AcceptTermsState,
  formData: FormData,
): Promise<AcceptTermsState> {
  if (formData.get('acceptTerms') !== 'accepted') {
    return { error: 'Zaakceptuj Regulamin, aby kontynuować.' };
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
        registrationMethod: 'ACCOUNT_RECONSENT',
        earlyServiceStartRequested: false,
      },
      user.id,
    );
  } catch (error) {
    console.error('Nie udało się zapisać akceptacji Regulaminu.', error);
    return {
      error: 'Nie udało się zapisać akceptacji Regulaminu. Spróbuj ponownie.',
    };
  }

  redirect('/');
}
