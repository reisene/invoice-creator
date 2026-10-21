'use client';

import { COOKIE_CONSENT_CHANGED_EVENT } from '@/lib/cookieConsent';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useEffect, useRef } from 'react';

export default function VercelTelemetry() {
  const allowed = useRef(true);

  useEffect(() => {
    const stopCollection = () => {
      allowed.current = false;
    };
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, stopCollection);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, stopCollection);
    };
  }, []);

  function beforeSend<T extends { url: string }>(event: T): T | null {
    if (!allowed.current) return null;
    const url = new URL(event.url);
    if (/^\/(auth|account|api|terms\/accept)(\/|$)/.test(url.pathname)) {
      return null;
    }
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  }

  return (
    <>
      <Analytics beforeSend={beforeSend} debug={false} />
      <SpeedInsights beforeSend={beforeSend} debug={false} />
    </>
  );
}
