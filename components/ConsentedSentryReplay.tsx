import ConsentedSentryReplayClient from '@/components/ConsentedSentryReplayClient';
import {
  COOKIE_CONSENT_COOKIE,
  parseCookieConsentCookie,
} from '@/lib/cookieConsent';
import { cookies } from 'next/headers';

export default async function ConsentedSentryReplay() {
  const cookieStore = await cookies();
  const choice = parseCookieConsentCookie(
    cookieStore.get(COOKIE_CONSENT_COOKIE)?.value,
  );

  return choice === 'ACCEPT_OPTIONAL' ? <ConsentedSentryReplayClient /> : null;
}
