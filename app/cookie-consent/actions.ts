'use server';

import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_VERSION,
  getCookieConsentCookieValue,
  isCookieConsentChoice,
} from '@/lib/cookieConsent';
import { getCurrentUserId } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { cookies } from 'next/headers';

export type CookieConsentActionResult =
  { ok: true } | { ok: false; message: string };

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function saveCookieConsent(
  choice: unknown,
): Promise<CookieConsentActionResult> {
  if (!isCookieConsentChoice(choice)) {
    return { ok: false, message: 'Nieprawidłowy wybór cookies.' };
  }

  try {
    const userId = await getCurrentUserId();
    const rateLimit = await checkRateLimit('cookieConsent', userId);
    if (!rateLimit.ok) return rateLimit;

    await prisma.cookieConsent.create({
      data: {
        userId,
        consentVersion: COOKIE_CONSENT_VERSION,
        choice,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(
      COOKIE_CONSENT_COOKIE,
      getCookieConsentCookieValue(choice),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      },
    );

    return { ok: true };
  } catch (error) {
    console.error(
      '[cookie-consent] Failed to record cookie preference.',
      error,
    );
    return {
      ok: false,
      message: 'Nie udało się zapisać wyboru. Spróbuj ponownie.',
    };
  }
}

export async function clearCookieConsent(): Promise<CookieConsentActionResult> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_CONSENT_COOKIE);
    return { ok: true };
  } catch (error) {
    console.error('[cookie-consent] Failed to clear cookie preference.', error);
    return {
      ok: false,
      message: 'Nie udało się usunąć zapisanego wyboru. Spróbuj ponownie.',
    };
  }
}
