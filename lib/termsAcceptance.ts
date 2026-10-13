import pkg from '@/package.json' with { type: 'json' };
import { statSync } from 'node:fs';
import path from 'node:path';

const termsFilePath = path.join(process.cwd(), 'lib', 'termsAcceptance.ts');

export const TERMS_LAST_MODIFIED = statSync(termsFilePath).mtime;

const termVer: () => string = (): string => {
  const match = pkg.version.match(/^v?(\d+)\.(\d+)(?:\.(\d+))?/);

  if (!match) {
    return 'wersja robocza';
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);

  if (major === 0 && minor === 1) {
    return 'projekt 0.1';
  }

  return `${major}.${minor}`;
};

export const TERMS_VERSION: string = termVer();

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
