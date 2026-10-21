'use client';

import { COOKIE_CONSENT_CHANGED_EVENT } from '@/lib/cookieConsent';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function ConsentedSentryReplayClient() {
  useEffect(() => {
    let consentWithdrawn = false;
    let stopReplay: (() => void) | undefined;

    const revokeConsent = () => {
      consentWithdrawn = true;
      stopReplay?.();
    };

    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, revokeConsent);

    void import('@sentry/nextjs')
      .then(({ replayIntegration }) => {
        if (consentWithdrawn) return;

        const replay = replayIntegration();
        Sentry.addIntegration(replay);
        stopReplay = () => {
          void replay.stop({ flush: false }).catch(Sentry.captureException);
        };
        if (consentWithdrawn) stopReplay();
      })
      .catch(Sentry.captureException);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, revokeConsent);
      stopReplay?.();
    };
  }, []);

  return null;
}
