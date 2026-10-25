import ConsentedSentryReplayClient from '@/components/telemetry/ConsentedSentryReplayClient';
import {
  COOKIE_CONSENT_COOKIE,
  allowsReplay,
  parseCookieConsentCookie,
} from '@/lib/cookieConsent';
import { cookies } from 'next/headers';

export default async function ConsentedSentryReplay() {
  const cookieStore = await cookies();
  const choice = parseCookieConsentCookie(
    cookieStore.get(COOKIE_CONSENT_COOKIE)?.value,
  );

  return allowsReplay(choice) ? <ConsentedSentryReplayClient /> : null;
}
