export type RegistrationMethod =
  'EMAIL_PASSWORD' | 'MAGIC_LINK' | 'ACCOUNT_RECONSENT';

type SignupMethod = Exclude<RegistrationMethod, 'ACCOUNT_RECONSENT'>;

export type RegistrationConsent = {
  email: string;
  registrationMethod: RegistrationMethod;
  earlyServiceStartRequested: boolean;
};

export type RegistrationConsentResult =
  { consent: RegistrationConsent } | { error: string };

export function parseRegistrationConsent(
  formData: FormData,
  registrationMethod: SignupMethod,
): RegistrationConsentResult {
  if (formData.get('acceptTerms') !== 'accepted') {
    return { error: 'Zaakceptuj Regulamin, aby utworzyć Konto.' };
  }

  const email = formData.get('email');
  if (typeof email !== 'string' || !email.trim()) {
    return { error: 'Podaj adres e-mail.' };
  }

  return {
    consent: {
      email: email.trim().toLowerCase(),
      registrationMethod,
      earlyServiceStartRequested:
        formData.get('requestImmediateStart') === 'requested',
    },
  };
}
