'use client';

import { TERMS_VERSION } from '@/lib/termsAcceptance';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { requestMagicLink } from './actions';

function MagicLinkFormInner() {
  const isSignUp = useSearchParams().get('mode') === 'signup';
  const [state, formAction, isPending] = useActionState(requestMagicLink, null);

  return (
    <Container className='py-5 page-narrow'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 p-sm-4'
      >
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
            <Form.Control
              type='hidden'
              name='mode'
              value={isSignUp ? 'signup' : 'signin'}
            />

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

            {isSignUp && (
              <>
                <Form.Check
                  className='mb-3'
                  id='accept-terms'
                  name='acceptTerms'
                  type='checkbox'
                  value='accepted'
                  required
                  label={
                    <>
                      Akceptuję{' '}
                      <Link href='/terms' target='_blank' rel='noreferrer'>
                        Regulamin (wersja {TERMS_VERSION})
                      </Link>
                      .
                    </>
                  }
                />

                <Form.Check
                  className='mb-3'
                  id='request-immediate-start'
                  name='requestImmediateStart'
                  type='checkbox'
                  value='requested'
                  label='Wnoszę o rozpoczęcie świadczenia Usług przed upływem terminu na odstąpienie od Umowy (oświadczenie dobrowolne; jego brak nie blokuje Konta ani dostępu do Usług).'
                />
              </>
            )}

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
