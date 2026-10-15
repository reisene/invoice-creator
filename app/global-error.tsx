'use client';

import * as Sentry from '@sentry/nextjs';
import 'bootstrap/dist/css/bootstrap.min.css';
import Error from 'next/error';
import { useEffect } from 'react';
import './globals.css';

export default function GlobalError({
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
    <html lang='pl' data-bs-theme='dark'>
      <body className='min-vh-100 d-flex align-items-center justify-content-center'>
        <main className='container page-medium text-center py-5'>
          <h1 className='h3 mb-3'>Coś poszło nie tak</h1>
          <p className='text-body-secondary mb-4'>
            Wystąpił krytyczny błąd aplikacji. Spróbuj ponownie. Jeśli problem
            się powtarza, wróć za chwilę.
          </p>
          <button
            type='button'
            className='btn btn-primary mb-4'
            onClick={() => retry()}
          >
            Spróbuj ponownie
          </button>
          {error.digest && (
            <p className='small text-body-secondary mb-0'>
              Kod błędu: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
