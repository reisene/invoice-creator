import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { Button, Container } from 'react-bootstrap';
import { DeleteAccountForm, PasswordForm, ProfileForm } from './AccountForms';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) redirect('/auth/sign-in');

  return (
    <Container className='py-4' style={{ maxWidth: 720 }}>
      <h1 className='mb-4'>Moje konto</h1>

      <ProfileForm
        name={user.name}
        email={user.email}
        emailVerified={user.emailVerified}
      />
      <PasswordForm />
      <DeleteAccountForm />

      <div className='d-flex gap-2'>
        <Button href='/account/invoices' variant='outline-primary'>
          Moje rachunki i dane stron
        </Button>
        <Button href='/generator' variant='outline-secondary'>
          Generator
        </Button>
      </div>
    </Container>
  );
}
