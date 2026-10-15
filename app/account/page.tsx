import { auth } from '@/lib/auth/server';
import { getUserBankAccount } from '@/lib/savedDataAccess';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Button, Card, Container } from 'react-bootstrap';
import {
  BankAccountForm,
  DeleteAccountForm,
  EmailChangeForm,
  PasswordForm,
  ProfileForm,
} from './AccountForms';
import { ImportDataCard } from './ImportDataCard';
import SessionsCard from './SessionsCard';

export const metadata: Metadata = { title: 'Moje konto' };

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) redirect('/auth/sign-in');
  const bankAccount = await getUserBankAccount(user.id);

  return (
    <Container className='py-4 page-medium'>
      <h1 className='mb-4'>Moje konto</h1>

      <ProfileForm
        name={user.name}
        email={user.email}
        emailVerified={user.emailVerified}
      />
      <EmailChangeForm />
      <PasswordForm />
      <BankAccountForm bankAccount={bankAccount} />

      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 mb-4'
      >
        <h2 className='h5 mb-2'>Eksport danych konta</h2>
        <p className='text-body-secondary small'>
          Pobierz dane profilu (imię i nazwisko oraz e-mail), zapisane rachunki,
          dane stron, dane rachunku bankowego i historię wyborów cookies w pliku
          JSON. Eksport nie obejmuje dowodów akceptacji Regulaminu ani zgłoszeń
          kontaktowych. W sprawie dostępu do pozostałych danych skontaktuj się z
          administratorem zgodnie z Polityką prywatności.
        </p>
        <div>
          <Button href='/api/account/export' variant='outline-primary'>
            Pobierz moje dane
          </Button>
        </div>
      </Card>
      <ImportDataCard />
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
