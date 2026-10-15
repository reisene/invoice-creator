'use client';

import type { UserBankAccountDto } from '@/types/savedData';
import { useRouter } from 'next/navigation';
import { useActionState, useState, useTransition } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import {
  changePassword,
  confirmEmailChange,
  deleteAccount,
  deleteBankAccount,
  requestAccountDeletionCode,
  requestEmailChange,
  saveBankAccount,
  updateProfile,
} from './actions';

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
    <Card
      body
      className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 mb-4'
    >
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
            {!emailVerified && (
              <>
                <a
                  href={`/auth/verify-email?email=${encodeURIComponent(email)}`}
                >
                  Zweryfikuj adres e-mail.
                </a>{' '}
              </>
            )}
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
    <Card
      body
      className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 mb-4'
    >
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

export function BankAccountForm({
  bankAccount,
}: {
  bankAccount: UserBankAccountDto | null;
}) {
  const [saveState, saveAction, saving] = useActionState(saveBankAccount, null);
  const [deleteState, setDeleteState] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [deleting, startDelete] = useTransition();
  const router = useRouter();

  return (
    <Card
      body
      className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 mb-4'
    >
      <h2 className='h5 mb-2'>Rachunek bankowy</h2>
      <p className='text-body-secondary small'>
        Zapisany rachunek możesz wybrać jako formę wypłaty w generatorze.
        Szczegóły są przechowywane w postaci zaszyfrowanej.
      </p>
      <Form action={saveAction}>
        <Form.Group className='mb-3' controlId='bankAccountHolder'>
          <Form.Label>Właściciel rachunku</Form.Label>
          <Form.Control
            name='accountHolder'
            defaultValue={bankAccount?.accountHolder ?? ''}
            required
            maxLength={200}
          />
        </Form.Group>
        <Form.Group className='mb-3' controlId='bankName'>
          <Form.Label>Nazwa banku / instytucji</Form.Label>
          <Form.Control
            name='bankName'
            defaultValue={bankAccount?.bankName ?? ''}
            required
            maxLength={100}
            placeholder='np. mBank, PKO BP, ZEN, Revolut'
          />
        </Form.Group>
        <Form.Group className='mb-3' controlId='bankAccountNumber'>
          <Form.Label>Numer rachunku</Form.Label>
          <Form.Control
            name='accountNumber'
            defaultValue={bankAccount?.accountNumber ?? ''}
            required
            inputMode='numeric'
            maxLength={34}
            autoComplete='off'
          />
          <Form.Text>
            Polski numer rachunku (26 cyfr), opcjonalnie z PL.
          </Form.Text>
        </Form.Group>
        {saveState && (
          <Alert variant={saveState.ok ? 'success' : 'danger'}>
            {saveState.message}
          </Alert>
        )}
        <Button type='submit' disabled={saving}>
          {saving ? 'Zapisywanie…' : 'Zapisz rachunek bankowy'}
        </Button>
      </Form>
      {bankAccount && (
        <div className='mt-3'>
          {deleteState && (
            <Alert variant={deleteState.ok ? 'success' : 'danger'}>
              {deleteState.message}
            </Alert>
          )}
          <Button
            type='button'
            variant='outline-danger'
            disabled={deleting}
            onClick={() => {
              if (!window.confirm('Usunąć zapisany rachunek bankowy?')) return;
              startDelete(async () => {
                const result = await deleteBankAccount();
                setDeleteState(result);
                if (result.ok) router.refresh();
              });
            }}
          >
            {deleting ? 'Usuwanie…' : 'Usuń zapisany rachunek'}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, isPending] = useActionState(deleteAccount, null);
  const [method, setMethod] = useState('password');
  const [codeState, codeAction, sendingCode] = useActionState(
    requestAccountDeletionCode,
    null,
  );

  return (
    <Card
      body
      className='border border-danger-subtle bg-danger-subtle bg-opacity-10 shadow-sm rounded-4 mb-4'
    >
      <h2 className='h5 text-danger mb-3'>Usuń konto</h2>
      <p className='small text-muted'>
        Usunięcie konta jest nieodwracalne. Razem z nim zostaną trwale skasowane
        wszystkie zapisane rachunki, dane stron i dane konta bankowego. Jeśli
        usunięcie konta się nie powiedzie, dane mogą już zostać skasowane; wtedy
        ponów operację. Przed usunięciem możesz pobrać eksport danych. Dowody
        akceptacji Regulaminu zostaną usunięte, chyba że są niezbędne w
        konkretnym sporze. Wiadomości kontaktowe podlegają odrębnej retencji
        opisanej w Polityce prywatności.
      </p>
      <Form.Group className='mb-3' controlId='deleteMethod'>
        <Form.Label>Potwierdzenie tożsamości</Form.Label>
        <Form.Select
          value={method}
          disabled={isPending || sendingCode}
          onChange={(event) => setMethod(event.target.value)}
        >
          <option value='password'>Hasło</option>
          <option value='email-code'>
            Kod e-mail (także dla kont bez hasła)
          </option>
        </Form.Select>
      </Form.Group>
      {method === 'email-code' && (
        <Form action={codeAction} className='mb-3'>
          <Button
            type='submit'
            variant='outline-secondary'
            disabled={sendingCode || isPending}
          >
            {sendingCode ? 'Wysyłanie…' : 'Wyślij kod e-mail'}
          </Button>
          {codeState && (
            <Alert
              className='mt-3'
              variant={codeState.ok ? 'success' : 'danger'}
            >
              {codeState.message}
            </Alert>
          )}
        </Form>
      )}
      <Form action={formAction}>
        <input type='hidden' name='method' value={method} />
        {method === 'password' ? (
          <Form.Group className='mb-3' controlId='deletePassword'>
            <Form.Label>Hasło</Form.Label>
            <Form.Control
              name='password'
              type='password'
              required
              autoComplete='current-password'
            />
          </Form.Group>
        ) : (
          <Form.Group className='mb-3' controlId='deleteOtp'>
            <Form.Label>Kod z wiadomości e-mail</Form.Label>
            <Form.Control
              name='otp'
              type='text'
              inputMode='numeric'
              autoComplete='one-time-code'
              pattern='[0-9]{6}'
              maxLength={6}
              required
            />
          </Form.Group>
        )}

        <Form.Check
          className='mb-3'
          type='checkbox'
          id='deleteConfirm'
          name='confirm'
          required
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

export function EmailChangeForm() {
  const [requestState, requestAction, requesting] = useActionState(
    requestEmailChange,
    null,
  );
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmEmailChange,
    null,
  );
  const [newEmail, setNewEmail] = useState('');

  return (
    <Card body className='shadow-sm mb-4'>
      <h2 className='h5 mb-3'>Zmiana adresu e-mail</h2>
      {confirmState?.ok ? (
        <Alert variant='success'>{confirmState.message}</Alert>
      ) : (
        <>
          <Form action={requestAction}>
            <Form.Group className='mb-3' controlId='newEmail'>
              <Form.Label>Nowy adres e-mail</Form.Label>
              <Form.Control
                name='newEmail'
                type='email'
                required
                autoComplete='email'
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </Form.Group>
            <Button
              type='submit'
              variant='outline-primary'
              disabled={requesting}
            >
              {requesting ? 'Wysyłanie…' : 'Wyślij kod'}
            </Button>
          </Form>

          {requestState && (
            <Alert
              variant={requestState.ok ? 'success' : 'danger'}
              className='mt-3 mb-0'
            >
              {requestState.message}
            </Alert>
          )}

          {requestState?.ok && (
            <Form action={confirmAction} className='mt-3'>
              <input type='hidden' name='newEmail' value={newEmail} />
              <Form.Group className='mb-3' controlId='emailChangeOtp'>
                <Form.Label>Kod z wiadomości</Form.Label>
                <Form.Control
                  name='otp'
                  required
                  inputMode='numeric'
                  autoComplete='one-time-code'
                />
              </Form.Group>
              {confirmState && (
                <Alert variant='danger'>{confirmState.message}</Alert>
              )}
              <Button type='submit' disabled={confirming}>
                {confirming ? 'Sprawdzanie…' : 'Potwierdź zmianę'}
              </Button>
            </Form>
          )}
        </>
      )}
    </Card>
  );
}
