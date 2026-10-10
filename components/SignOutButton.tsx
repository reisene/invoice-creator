'use client';

import { authClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { Button } from 'react-bootstrap';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <Button onClick={handleSignOut} variant={'danger'}>
      Sign Out
    </Button>
  );
}
