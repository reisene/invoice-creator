'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button, Container } from 'react-bootstrap';
import {
  BsArrowClockwise,
  BsExclamationTriangle,
  BsHouse,
} from 'react-icons/bs';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Container className='py-5 page-medium text-center'>
      <BsExclamationTriangle
        aria-hidden
        size={64}
        className='text-danger mb-3'
      />
      <h1 className='h3 mb-3'>Coś poszło nie tak</h1>
      <p className='text-body-secondary mb-4'>
        Wystąpił nieoczekiwany błąd. Spróbuj ponownie. Jeśli problem się
        powtarza, wróć za chwilę lub zgłoś go autorowi.
      </p>
      <div className='d-flex flex-wrap justify-content-center gap-2 mb-4'>
        <Button
          variant='primary'
          className='d-inline-flex align-items-center gap-2'
          onClick={() => retry()}
        >
          <BsArrowClockwise aria-hidden />
          Spróbuj ponownie
        </Button>
        <Button
          href='/'
          variant='outline-secondary'
          className='d-inline-flex align-items-center gap-2'
        >
          <BsHouse aria-hidden />
          Strona główna
        </Button>
      </div>
      {error.digest && (
        <p className='small text-body-secondary mb-0'>
          Kod błędu: <code>{error.digest}</code>
        </p>
      )}
    </Container>
  );
}
