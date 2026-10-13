'use client';

import { authClient } from '@/lib/auth/client';
import { Button, ButtonToolbar, Placeholder } from 'react-bootstrap';
import {
  BsBoxArrowInRight,
  BsPersonCircle,
  BsPersonPlus,
} from 'react-icons/bs';
import SignOutButton from './SignOutButton';

export default function AuthButtons() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <ButtonToolbar className='gap-2' aria-busy='true' aria-hidden='true'>
        <Placeholder
          as='div'
          className='rounded-3 bg-secondary'
          style={{ width: '110px', height: '38px', opacity: 0.15 }}
        />
        <Placeholder
          as='div'
          className='rounded-3 bg-secondary'
          style={{ width: '105px', height: '38px', opacity: 0.15 }}
        />
      </ButtonToolbar>
    );
  }

  if (session?.user) {
    return (
      <ButtonToolbar className='gap-2'>
        <Button
          href={'/account'}
          variant={'primary'}
          className='d-inline-flex align-items-center gap-2'
        >
          <BsPersonCircle aria-hidden />
          Konto
        </Button>
        <SignOutButton />
      </ButtonToolbar>
    );
  }

  return (
    <ButtonToolbar className='gap-2'>
      <Button
        href={'/auth/sign-up'}
        variant={'outline-primary'}
        className='d-inline-flex align-items-center gap-2'
      >
        <BsPersonPlus aria-hidden />
        Rejestracja
      </Button>
      <Button
        href={'/auth/sign-in'}
        variant={'primary'}
        className='d-inline-flex align-items-center gap-2'
      >
        <BsBoxArrowInRight aria-hidden />
        Logowanie
      </Button>
    </ButtonToolbar>
  );
}
