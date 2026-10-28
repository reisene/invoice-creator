'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type TurnstileOptions = {
  sitekey: string;
  action: string;
  'error-callback': () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function TurnstileWidget({
  action,
  resetSignal,
}: {
  action: string;
  resetSignal: unknown;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!scriptReady || !SITE_KEY || !containerRef.current || !window.turnstile)
      return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      action,
      'error-callback': () => setHasError(true),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, scriptReady]);

  useEffect(() => {
    if (resetSignal && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  if (!SITE_KEY) {
    return (
      <p className='small text-danger' role='alert'>
        Weryfikacja antyspamowa jest niedostępna. Spróbuj ponownie później.
      </p>
    );
  }

  return (
    <div className='mb-3'>
      <Script
        src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        strategy='afterInteractive'
        onReady={() => setScriptReady(true)}
        onError={() => setHasError(true)}
      />
      <div ref={containerRef} />
      {hasError && (
        <p className='small text-danger' role='alert'>
          Nie udało się załadować weryfikacji. Odśwież stronę i spróbuj
          ponownie.
        </p>
      )}
    </div>
  );
}
