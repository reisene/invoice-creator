'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { signUpWithEmail } from './actions';

export default function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <Container className='py-5' style={{ maxWidth: 440 }}>
      <Card body className='shadow-sm'>
        <h1 className='h4 text-center mb-4'>Utwórz konto</h1>

        {state?.success ? (
          <Alert variant='success'>
            Konto zostało utworzone. Wysłaliśmy wiadomość z linkiem
            weryfikacyjnym - potwierdź adres e-mail, a następnie się zaloguj.
          </Alert>
        ) : (
          <Form action={formAction}>
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

            {state?.error && <Alert variant='danger'>{state.error}</Alert>}

            <Button type='submit' disabled={isPending} className='w-100'>
              {isPending ? 'Tworzenie konta...' : 'Utwórz konto'}
            </Button>
          </Form>
        )}

        {!state?.success && (
          <Button
            href='/auth/magic-link?mode=signup'
            variant='outline-secondary'
            className='w-100 mt-2'
          >
            Zarejestruj się linkiem e-mail
          </Button>
        )}

        <p className='text-center text-body-secondary small mt-3 mb-0'>
          Masz już konto? <Link href='/auth/sign-in'>Zaloguj się</Link>
        </p>
      </Card>
    </Container>
  );
}
