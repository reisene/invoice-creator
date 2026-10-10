'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { requestMagicLink } from './actions';

function MagicLinkFormInner() {
  const isSignUp = useSearchParams().get('mode') === 'signup';
  const [state, formAction, isPending] = useActionState(requestMagicLink, null);

  return (
    <Container className='py-5' style={{ maxWidth: 440 }}>
      <Card body className='shadow-sm'>
        <h1 className='h4 text-center mb-4'>
          {isSignUp ? 'Rejestracja linkiem' : 'Logowanie linkiem'}
        </h1>

        {state?.success ? (
          <Alert variant='success'>
            {isSignUp
              ? 'Wysłaliśmy link na podany adres. Kliknij go, aby utworzyć konto i się zalogować.'
              : 'Wysłaliśmy link do logowania na podany adres. Sprawdź skrzynkę.'}
          </Alert>
        ) : (
          <Form action={formAction}>
            {isSignUp && (
              <Form.Group className='mb-3' controlId='name'>
                <Form.Label>Imię i nazwisko</Form.Label>
                <Form.Control name='name' type='text' autoComplete='name' />
              </Form.Group>
            )}

            <Form.Group className='mb-3' controlId='email'>
              <Form.Label>Adres e-mail</Form.Label>
              <Form.Control
                name='email'
                type='email'
                required
                autoComplete='email'
              />
            </Form.Group>

            {state?.error && <Alert variant='danger'>{state.error}</Alert>}

            <Button type='submit' disabled={isPending} className='w-100'>
              {isPending ? 'Wysyłanie...' : 'Wyślij link'}
            </Button>
          </Form>
        )}

        <p className='text-center small mt-3 mb-0'>
          <Link href='/auth/sign-in'>Wróć do logowania</Link>
        </p>
      </Card>
    </Container>
  );
}

export default function MagicLinkForm() {
  return (
    <Suspense>
      <MagicLinkFormInner />
    </Suspense>
  );
}
