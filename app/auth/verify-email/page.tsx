'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { resendVerificationCode, verifyEmailCode } from './actions';

function VerifyEmailForm() {
  const initialEmail = useSearchParams().get('email') ?? '';
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyEmailCode,
    null,
  );
  const [resendState, resendAction, resending] = useActionState(
    resendVerificationCode,
    null,
  );

  return (
    <Container className='py-5' style={{ maxWidth: 440 }}>
      <Card body className='shadow-sm'>
        <h1 className='h4 text-center mb-3'>Potwierdź adres e-mail</h1>
        <p className='text-body-secondary small'>
          Wysłaliśmy kod weryfikacyjny na Twój adres e-mail. Wpisz go poniżej.
        </p>

        {verifyState?.ok ? (
          <Alert variant='success'>
            {verifyState.message} <Link href='/auth/sign-in'>Zaloguj się</Link>
          </Alert>
        ) : (
          <Form id='verify-form' action={verifyAction}>
            <Form.Group className='mb-3' controlId='email'>
              <Form.Label>Adres e-mail</Form.Label>
              <Form.Control
                name='email'
                type='email'
                required
                defaultValue={initialEmail}
                autoComplete='email'
              />
            </Form.Group>
            <Form.Group className='mb-3' controlId='otp'>
              <Form.Label>Kod</Form.Label>
              <Form.Control
                name='otp'
                type='text'
                required
                inputMode='numeric'
                autoComplete='one-time-code'
              />
            </Form.Group>
            {verifyState && (
              <Alert variant='danger'>{verifyState.message}</Alert>
            )}
            <Button type='submit' disabled={verifying} className='w-100'>
              {verifying ? 'Sprawdzanie...' : 'Potwierdź'}
            </Button>
          </Form>
        )}

        {!verifyState?.ok && (
          <Form action={resendAction} className='mt-3'>
            <input type='hidden' name='email' value={initialEmail} readOnly />
            <Button
              type='submit'
              variant='outline-secondary'
              disabled={resending || !initialEmail}
              className='w-100'
            >
              {resending ? 'Wysyłanie...' : 'Wyślij kod ponownie'}
            </Button>
            {resendState && (
              <Alert
                variant={resendState.ok ? 'success' : 'danger'}
                className='mt-2 mb-0'
              >
                {resendState.message}
              </Alert>
            )}
          </Form>
        )}
      </Card>
    </Container>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
