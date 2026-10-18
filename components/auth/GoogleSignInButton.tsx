'use client';

import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/authErrors';
import { useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { FcGoogle } from 'react-icons/fc';

const DEFAULT_ERROR = 'Nie udało się zalogować przez Google. Spróbuj ponownie.';

export default function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/auth/terms-check',
      });

      if (result.error) {
        setError(authErrorMessage(result.error, DEFAULT_ERROR));
        setIsPending(false);
      }
    } catch {
      setError(DEFAULT_ERROR);
      setIsPending(false);
    }
  }

  return (
    <>
      <Button
        type='button'
        variant='outline-secondary'
        className='w-100 d-flex align-items-center justify-content-center gap-2'
        disabled={isPending}
        onClick={signInWithGoogle}
      >
        <FcGoogle
          size={20}
          aria-hidden='true'
          focusable='false'
          className='flex-shrink-0'
        />
        {isPending ? 'Łączenie z Google...' : 'Kontynuuj z Google'}
      </Button>
      {error && (
        <Alert variant='danger' role='alert' className='mt-2 mb-0'>
          {error}
        </Alert>
      )}
    </>
  );
}
