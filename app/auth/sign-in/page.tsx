'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { signInWithEmail } from './actions';

function SignInFormInner() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <Container className='py-5 page-narrow'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 p-sm-4'
      >
        <h1 className='h4 text-center mb-4'>Zaloguj się</h1>

        {searchParams.get('reset') && (
          <Alert variant='success'>
            Hasło zostało zmienione. Możesz się zalogować.
          </Alert>
        )}

        <Form action={formAction}>
          <Form.Group className='mb-3' controlId='email'>
            <Form.Label>Adres e-mail</Form.Label>
            <Form.Control
              name='email'
              type='email'
              required
              autoComplete='email'
              placeholder='jan@example.com'
            />
          </Form.Group>

          <Form.Group className='mb-3' controlId='password'>
            <div className='d-flex justify-content-between'>
              <Form.Label>Hasło</Form.Label>
              <Link href='/auth/forgot-password' className='small'>
                Nie pamiętasz hasła?
              </Link>
            </div>
            <Form.Control
              name='password'
              type='password'
              required
              autoComplete='current-password'
            />
          </Form.Group>

          {state?.error && <Alert variant='danger'>{state.error}</Alert>}

          <Button type='submit' disabled={isPending} className='w-100'>
            {isPending ? 'Logowanie...' : 'Zaloguj się'}
          </Button>
        </Form>

        <Button
          href='/auth/magic-link'
          variant='outline-secondary'
          className='w-100 mt-2'
        >
          Zaloguj się linkiem e-mail
        </Button>

        <p className='text-center text-body-secondary small mt-3 mb-0'>
          Nie masz konta? <Link href='/auth/sign-up'>Zarejestruj się</Link>
        </p>
      </Card>
    </Container>
  );
}

export default function SignInForm() {
  return (
    <Suspense>
      <SignInFormInner />
    </Suspense>
  );
}
