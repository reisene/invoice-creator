import { auth } from '@/lib/auth/server';
import { Button, ButtonToolbar } from 'react-bootstrap';
import SignOutButton from './SignOutButton';

export const dynamic = 'force-dynamic';

export default async function AuthButtons() {
  const { data: session } = await auth.getSession();

  if (session?.user) {
    return (
      <ButtonToolbar className='gap-2 ms-auto'>
        <Button href={'/account'} variant={'primary'}>
          Account
        </Button>
        <SignOutButton />
      </ButtonToolbar>
    );
  }

  return (
    <ButtonToolbar className='gap-2 ms-auto'>
      <Button href={'/auth/sign-up'} variant={'secondary'}>
        Sign Up
      </Button>
      <Button href={'/auth/sign-in'} variant={'success'}>
        Sign In
      </Button>
    </ButtonToolbar>
  );
}
