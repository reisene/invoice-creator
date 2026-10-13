import CookieConsentBanner from '@/components/CookieConsentBanner';
import {
  COOKIE_CONSENT_COOKIE,
  parseCookieConsentCookie,
} from '@/lib/cookieConsent';
import { cookies } from 'next/headers';

export default async function CookieConsent() {
  const cookieStore = await cookies();
  const initialChoice = parseCookieConsentCookie(
    cookieStore.get(COOKIE_CONSENT_COOKIE)?.value,
  );

  return <CookieConsentBanner initialChoice={initialChoice} />;
}
