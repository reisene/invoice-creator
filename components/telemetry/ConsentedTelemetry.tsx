import VercelTelemetry from '@/components/telemetry/VercelTelemetry';
import {
  COOKIE_CONSENT_COOKIE,
  allowsAnalytics,
  parseCookieConsentCookie,
} from '@/lib/cookieConsent';
import { cookies } from 'next/headers';

export default async function ConsentedTelemetry() {
  const cookieStore = await cookies();
  const choice = parseCookieConsentCookie(
    cookieStore.get(COOKIE_CONSENT_COOKIE)?.value,
  );

  return allowsAnalytics(choice) ? <VercelTelemetry /> : null;
}
