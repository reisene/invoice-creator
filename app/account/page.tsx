import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { Button, Card, Container } from 'react-bootstrap';
import {
  DeleteAccountForm,
  EmailChangeForm,
  PasswordForm,
  ProfileForm,
} from './AccountForms';
import SessionsCard from './SessionsCard';

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
      <EmailChangeForm />
      <PasswordForm />

      <Card body className='shadow-sm mb-4'>
        <h2 className='h5 mb-2'>Eksport danych</h2>
        <p className='text-body-secondary small'>
          Pobierz wszystkie zapisane rachunki i dane stron w pliku JSON.
        </p>
        <div>
          <Button href='/api/account/export' variant='outline-primary'>
            Pobierz moje dane
          </Button>
        </div>
      </Card>
      <SessionsCard />
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
