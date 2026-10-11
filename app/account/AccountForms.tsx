'use client';

import { useActionState } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { changePassword, deleteAccount, updateProfile } from './actions';

export function ProfileForm({
  name,
  email,
  emailVerified,
}: {
  name: string;
  email: string;
  emailVerified: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  return (
    <Card body className='shadow-sm mb-4'>
      <h2 className='h5 mb-3'>Dane konta</h2>
      <Form action={formAction}>
        <Form.Group className='mb-3' controlId='name'>
          <Form.Label>Imię i nazwisko</Form.Label>
          <Form.Control
            name='name'
            defaultValue={name}
            required
            maxLength={100}
            autoComplete='name'
          />
        </Form.Group>

        <Form.Group className='mb-3' controlId='email'>
          <Form.Label>Adres e-mail</Form.Label>
          <Form.Control value={email} readOnly disabled />
          <Form.Text>
            {emailVerified ? 'Adres zweryfikowany.' : 'Adres niezweryfikowany.'}{' '}
            Zmiana adresu e-mail nie jest jeszcze dostępna.
          </Form.Text>
        </Form.Group>

        {state ? (
          <Alert variant={state.ok ? 'success' : 'danger'}>
            {state.message}
          </Alert>
        ) : null}

        <Button type='submit' disabled={isPending}>
          {isPending ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </Button>
      </Form>
    </Card>
  );
}

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, null);

  return (
    <Card body className='shadow-sm mb-4'>
      <h2 className='h5 mb-3'>Zmiana hasła</h2>
      <Form action={formAction} key={state?.ok ? 'done' : 'form'}>
        <Form.Group className='mb-3' controlId='currentPassword'>
          <Form.Label>Obecne hasło</Form.Label>
          <Form.Control
            name='currentPassword'
            type='password'
            required
            autoComplete='current-password'
          />
        </Form.Group>

        <Form.Group className='mb-3' controlId='newPassword'>
          <Form.Label>Nowe hasło</Form.Label>
          <Form.Control
            name='newPassword'
            type='password'
            required
            minLength={8}
            autoComplete='new-password'
          />
        </Form.Group>

        <Form.Group className='mb-3' controlId='confirm'>
          <Form.Label>Powtórz nowe hasło</Form.Label>
          <Form.Control
            name='confirm'
            type='password'
            required
            minLength={8}
            autoComplete='new-password'
          />
        </Form.Group>

        {state ? (
          <Alert variant={state.ok ? 'success' : 'danger'}>
            {state.message}
          </Alert>
        ) : null}

        <Button type='submit' disabled={isPending}>
          {isPending ? 'Zapisywanie…' : 'Zmień hasło'}
        </Button>
      </Form>
    </Card>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, isPending] = useActionState(deleteAccount, null);

  return (
    <Card body className='shadow-sm border-danger mb-4'>
      <h2 className='h5 text-danger mb-3'>Usuń konto</h2>
      <p className='small text-muted'>
        Usunięcie konta jest nieodwracalne. Razem z nim zostaną trwale skasowane
        wszystkie zapisane rachunki i dane stron.
      </p>
      <Form action={formAction}>
        <Form.Group className='mb-3' controlId='deletePassword'>
          <Form.Label>Hasło</Form.Label>
          <Form.Control
            name='password'
            type='password'
            required
            autoComplete='current-password'
          />
        </Form.Group>

        <Form.Check
          className='mb-3'
          type='checkbox'
          id='deleteConfirm'
          name='confirm'
          label='Rozumiem, że konta i danych nie da się odzyskać.'
        />

        {state ? <Alert variant='danger'>{state.message}</Alert> : null}

        <Button type='submit' variant='danger' disabled={isPending}>
          {isPending ? 'Usuwanie…' : 'Usuń konto i dane'}
        </Button>
      </Form>
    </Card>
  );
}
