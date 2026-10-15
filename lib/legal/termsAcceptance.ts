export type RegistrationMethod =
  'EMAIL_PASSWORD' | 'MAGIC_LINK' | 'ACCOUNT_RECONSENT';

type SignupMethod = Exclude<RegistrationMethod, 'ACCOUNT_RECONSENT'>;

export type RegistrationConsent = {
  email: string;
  termsVersion: string;
  registrationMethod: RegistrationMethod;
  earlyServiceStartRequested: boolean;
};

export type RegistrationConsentResult =
  { consent: RegistrationConsent } | { error: string };

export function parseRegistrationConsent(
  formData: FormData,
  registrationMethod: SignupMethod,
  currentTermsVersion: string,
): RegistrationConsentResult {
  if (formData.get('acceptTerms') !== 'accepted') {
    return { error: 'Zaakceptuj Regulamin, aby utworzyć Konto.' };
  }

  if (formData.get('termsVersion') !== currentTermsVersion) {
    return {
      error:
        'Wersja Regulaminu uległa zmianie. Odśwież stronę i zapoznaj się z aktualnym dokumentem.',
    };
  }

  const email = formData.get('email');
  if (typeof email !== 'string' || !email.trim()) {
    return { error: 'Podaj adres e-mail.' };
  }

  return {
    consent: {
      email: email.trim().toLowerCase(),
      termsVersion: currentTermsVersion,
      registrationMethod,
      earlyServiceStartRequested:
        formData.get('requestImmediateStart') === 'requested',
    },
  };
}
