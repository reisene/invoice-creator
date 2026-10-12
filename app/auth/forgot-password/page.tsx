'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { requestPasswordReset } from './actions';

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    null,
  );

  return (
    <Container className='py-5 page-narrow'>
      <Card body className='shadow-sm'>
        <h1 className='h4 text-center mb-4'>Resetowanie hasła</h1>

        {state?.success ? (
          <Alert variant='success'>
            Jeśli konto z tym adresem istnieje, wysłaliśmy na niego link do
            zmiany hasła.
          </Alert>
        ) : (
          <Form action={formAction}>
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
