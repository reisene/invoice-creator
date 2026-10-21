'use client';

import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import Link from 'next/link';
import { useActionState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { signUpWithEmail } from './actions';

export default function SignUpForm({ termsVersion }: { termsVersion: string }) {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <Container className='py-5 page-narrow'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 p-sm-4'
      >
        <h1 className='h4 text-center mb-4'>Utwórz konto</h1>

        <Form action={formAction}>
          <Form.Control
            type='hidden'
            name='termsVersion'
            value={termsVersion}
          />

          <Form.Group className='mb-3' controlId='name'>
            <Form.Label>Imię i nazwisko</Form.Label>
            <Form.Control
              name='name'
              type='text'
              required
              autoComplete='name'
              placeholder='Jan Kowalski'
            />
          </Form.Group>

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
            <Form.Label>Hasło</Form.Label>
            <Form.Control
              name='password'
              type='password'
              required
              autoComplete='new-password'
            />
          </Form.Group>

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
                  Regulamin (wersja {termsVersion})
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

          {state?.error && <Alert variant='danger'>{state.error}</Alert>}

          <Button type='submit' disabled={isPending} className='w-100'>
            {isPending ? 'Tworzenie konta...' : 'Utwórz konto'}
          </Button>
        </Form>

        <Button
          href='/auth/magic-link?mode=signup'
          variant='outline-secondary'
          className='w-100 mt-2'
        >
          Zarejestruj się linkiem e-mail
        </Button>
        <GoogleSignInButton />

        <p className='text-center text-body-secondary small mt-3 mb-0'>
          Masz już konto? <Link href='/auth/sign-in'>Zaloguj się</Link>
        </p>
      </Card>
    </Container>
  );
}
