'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { resetPassword } from './actions';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  return (
    <Card
      body
      className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 p-sm-4'
    >
      <h1 className='h4 text-center mb-4'>Ustaw nowe hasło</h1>

      <Form action={formAction}>
        <input type='hidden' name='token' value={token} />

        <Form.Group className='mb-3' controlId='password'>
          <Form.Label>Nowe hasło</Form.Label>
          <Form.Control
            name='password'
            type='password'
            required
            autoComplete='new-password'
          />
        </Form.Group>

        <Form.Group className='mb-3' controlId='confirm'>
          <Form.Label>Powtórz hasło</Form.Label>
          <Form.Control
            name='confirm'
            type='password'
            required
            autoComplete='new-password'
          />
        </Form.Group>

        {(!token || state?.error) && (
          <Alert variant='danger'>
            {state?.error ?? 'Link jest nieprawidłowy lub wygasł.'}
          </Alert>
        )}

        <Button type='submit' disabled={isPending || !token} className='w-100'>
          {isPending ? 'Zapisywanie...' : 'Zmień hasło'}
        </Button>
      </Form>

      <p className='text-center small mt-3 mb-0'>
        <Link href='/auth/forgot-password'>Wyślij nowy link</Link>
      </p>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Container className='py-5 page-narrow'>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </Container>
  );
}
