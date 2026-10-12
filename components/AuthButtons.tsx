import { auth } from '@/lib/auth/server';
import { Button, ButtonToolbar } from 'react-bootstrap';
import {
  BsBoxArrowInRight,
  BsPersonCircle,
  BsPersonPlus,
} from 'react-icons/bs';
import SignOutButton from './SignOutButton';

export const dynamic = 'force-dynamic';

export default async function AuthButtons() {
  const { data: session } = await auth.getSession();

  if (session?.user) {
    return (
      <ButtonToolbar className='gap-2 ms-auto'>
        <Button
          href={'/account'}
          variant={'primary'}
          className='d-inline-flex align-items-center gap-2'
        >
          <BsPersonCircle aria-hidden />
          Account
        </Button>
        <SignOutButton />
      </ButtonToolbar>
    );
  }

  return (
    <ButtonToolbar className='gap-2 ms-auto'>
      <Button
        href={'/auth/sign-up'}
        variant={'secondary'}
        className='d-inline-flex align-items-center gap-2'
      >
        <BsPersonPlus aria-hidden />
        Sign Up
      </Button>
      <Button
        href={'/auth/sign-in'}
        variant={'success'}
        className='d-inline-flex align-items-center gap-2'
      >
        <BsBoxArrowInRight aria-hidden />
        Sign In
      </Button>
    </ButtonToolbar>
  );
}
