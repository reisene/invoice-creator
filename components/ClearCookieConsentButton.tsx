'use client';

import { clearCookieConsent } from '@/app/cookie-consent/actions';
import { useState, useTransition } from 'react';
import { Alert, Button } from 'react-bootstrap';

export default function ClearCookieConsentButton({
  hasChoice,
}: {
  hasChoice: boolean;
}) {
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  function clearChoice() {
    setMessage('');
    startTransition(async () => {
      const result = await clearCookieConsent();
      if (!result.ok) {
        setMessage(result.message);
      }
    });
  }

  return (
    <div className='mt-3'>
      <Button
        disabled={isPending || !hasChoice}
        onClick={clearChoice}
        variant='outline-secondary'
      >
        {isPending
          ? 'Usuwanie wyboru…'
          : 'Usuń zapamiętany wybór i pokaż baner ponownie'}
      </Button>
      <p className='small text-body-secondary mt-2 mb-0'>
        Ta czynność usuwa tylko wybór cookies na tym urządzeniu. Historię
        decyzji przechowujemy przez 30 dni. Aby usunąć także cookies logowania,
        wyczyść dane tej witryny w ustawieniach przeglądarki — zostaniesz
        wylogowana.
      </p>
      {message && (
        <Alert className='mt-3 mb-0' role='alert' variant='danger'>
          {message}
        </Alert>
      )}
    </div>
  );
}
