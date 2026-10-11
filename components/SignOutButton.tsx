'use client';

import { authClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { Button } from 'react-bootstrap';
import { BsBoxArrowRight } from 'react-icons/bs';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <Button
      onClick={handleSignOut}
      variant={'danger'}
      className='d-inline-flex align-items-center gap-2'
    >
      <BsBoxArrowRight aria-hidden />
      Sign Out
    </Button>
  );
}
