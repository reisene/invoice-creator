'use client';

import { saveCookieConsent } from '@/app/cookie-consent/actions';
import {
  COOKIE_SETTINGS_EVENT,
  type CookieConsentChoice,
} from '@/lib/cookieConsent';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Alert, Button, Card, CardBody, Collapse } from 'react-bootstrap';
import { BsCookie } from 'react-icons/bs';

export default function CookieConsentBanner({
  initialChoice,
}: {
  initialChoice: CookieConsentChoice | null;
}) {
  const [isOpen, setIsOpen] = useState(initialChoice === null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const openSettings = () => {
      setError('');
      setShowDetails(true);
      setIsOpen(true);
    };

    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);
    return () =>
      window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  function choose(choice: CookieConsentChoice) {
    setError('');
    startTransition(async () => {
      const result = await saveCookieConsent(choice);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setIsOpen(false);
    });
  }

  if (!isOpen) {
    return (
      <Button
        aria-label='Otwórz ustawienia cookies'
        className='cookie-consent-floating-button d-inline-flex align-items-center gap-2 rounded-pill shadow'
        onClick={() => {
          setError('');
          setShowDetails(true);
          setIsOpen(true);
        }}
        variant='secondary'
      >
        <BsCookie aria-hidden='true' size={18} />
        <span>Cookies</span>
      </Button>
    );
  }

  return (
    <aside
      aria-labelledby='cookie-consent-title'
      className='cookie-consent-banner'
      role='region'
    >
      <Card className='cookie-consent-card border border-secondary-subtle rounded-4 shadow-lg'>
        <CardBody className='p-4'>
          <div className='cookie-consent-heading d-flex align-items-start gap-3 mb-3'>
            <span className='cookie-consent-mark' aria-hidden='true'>
              ◉
            </span>
            <div>
              <p className='small text-uppercase fw-semibold text-body-secondary mb-1'>
                Twoja prywatność
              </p>
              <h2 className='h5 mb-0' id='cookie-consent-title'>
                Ty decydujesz o cookies
              </h2>
            </div>
          </div>

          <p className='text-body-secondary mb-3'>
            Używamy cookies niezbędnych do logowania i działania Serwisu.
            Obecnie nie korzystamy z cookies analitycznych ani reklamowych.
            Możesz zaakceptować cookies opcjonalne albo pozostać przy
            niezbędnych — wybór nie ogranicza dostępu do Serwisu.
          </p>

          <Collapse in={showDetails}>
            <div id='cookie-consent-details'>
              <div className='cookie-consent-details rounded-3 p-3 mb-3'>
                <div className='d-flex flex-column gap-3'>
                  <div className='d-flex flex-column flex-sm-row justify-content-between gap-1'>
                    <div>
                      <p className='fw-semibold mb-1'>Niezbędne</p>
                      <p className='small text-body-secondary mb-0'>
                        Logowanie i sesja Neon Auth (
                        <code>__Secure-neon-auth.session_token</code> oraz{' '}
                        <code>__Secure-neon-auth.local.session_data</code>).
                        Zawsze aktywne; nie zapisujemy dla nich zgody.
                      </p>
                    </div>
                    <span className='small fw-semibold text-nowrap'>
                      Zawsze aktywne
                    </span>
                  </div>
                  <hr className='my-0' />
                  <div>
                    <p className='fw-semibold mb-1'>Opcjonalne</p>
                    <p className='small text-body-secondary mb-0'>
                      Analityczne i reklamowe. Obecnie nie są używane. Jeśli
                      zostaną dodane, Serwis poprosi o osobny wybór przed ich
                      uruchomieniem.
                    </p>
                  </div>
                </div>
                <p className='small text-body-secondary border-top pt-3 mt-3 mb-0'>
                  Wybrana opcja jest zapisywana w cookie{' '}
                  <code>cookie-consent</code> przez 12 miesięcy. Rejestr decyzji
                  przechowujemy przez 30 dni. Możesz zmienić ustawienie w
                  dowolnym momencie w stopce. Więcej informacji:{' '}
                  <Link href='/privacy#cookies'>Polityka prywatności</Link>.
                </p>
              </div>
            </div>
          </Collapse>

          {error && (
            <Alert className='mb-3 py-2' variant='danger' role='alert'>
              {error}
            </Alert>
          )}

          <div className='cookie-consent-actions d-flex flex-column-reverse flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2'>
            <Button
              aria-controls='cookie-consent-details'
              aria-expanded={showDetails}
              className='cookie-consent-details-button'
              onClick={() => setShowDetails((current) => !current)}
              variant='link'
            >
              {showDetails ? 'Ukryj szczegóły' : 'Ustawienia i szczegóły'}
            </Button>
            <div className='d-flex flex-column flex-sm-row gap-2'>
              <Button
                className='cookie-consent-choice'
                disabled={isPending}
                onClick={() => choose('REJECT_OPTIONAL')}
                variant='outline-secondary'
              >
                Tylko niezbędne
              </Button>
              <Button
                className='cookie-consent-choice'
                disabled={isPending}
                onClick={() => choose('ACCEPT_OPTIONAL')}
                variant='outline-secondary'
              >
                Akceptuj wszystkie
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </aside>
  );
}
