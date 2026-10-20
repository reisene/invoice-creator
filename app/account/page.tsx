import { auth } from '@/lib/auth/server';
import { getUserBankAccount } from '@/lib/savedDataAccess';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  Button,
  Card,
  Container,
  Nav,
  NavItem,
  NavLink,
} from 'react-bootstrap';
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
    <Container className='account-page py-4 page-medium'>
      <div className='mb-4'>
        <h1 className='mb-2'>Moje konto</h1>
        <p className='text-body-secondary mb-3'>
          Zarządzaj profilem, danymi do rachunków i dostępem do konta.
        </p>
        <Nav
          as='nav'
          aria-label='Sekcje ustawień konta'
          className='flex-wrap gap-2'
        >
          <NavItem>
            <NavLink href='#profil' className='btn btn-outline-primary'>
              Profil
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink href='#dane-rachunkow' className='btn btn-outline-primary'>
              Dane do rachunków
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink href='#bezpieczenstwo' className='btn btn-outline-primary'>
              Bezpieczeństwo
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink href='#import-eksport' className='btn btn-outline-primary'>
              Import i eksport
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink href='#usun-konto' className='btn btn-outline-danger'>
              Usuwanie konta
            </NavLink>
          </NavItem>
        </Nav>
      </div>

      <section id='profil' aria-labelledby='profil-heading' className='mb-5'>
        <h2 id='profil-heading' className='h4 border-bottom pb-2 mb-3'>
          Profil
        </h2>
        <ProfileForm
          name={user.name}
          email={user.email}
          emailVerified={user.emailVerified}
        />
        <EmailChangeForm />
      </section>

      <section
        id='dane-rachunkow'
        aria-labelledby='dane-rachunkow-heading'
        className='mb-5'
      >
        <h2 id='dane-rachunkow-heading' className='h4 border-bottom pb-2 mb-3'>
          Dane do rachunków
        </h2>
        <BankAccountForm bankAccount={bankAccount} />
        <div className='d-flex flex-wrap gap-2'>
          <Button href='/account/invoices' variant='outline-primary'>
            Moje rachunki i dane stron
          </Button>
          <Button href='/generator' variant='outline-secondary'>
            Generator
          </Button>
        </div>
      </section>

      <section
        id='bezpieczenstwo'
        aria-labelledby='bezpieczenstwo-heading'
        className='mb-5'
      >
        <h2 id='bezpieczenstwo-heading' className='h4 border-bottom pb-2 mb-3'>
          Bezpieczeństwo
        </h2>
        <PasswordForm />
        <SessionsCard />
      </section>

      <section
        id='import-eksport'
        aria-labelledby='import-eksport-heading'
        className='mb-5'
      >
        <h2 id='import-eksport-heading' className='h4 border-bottom pb-2 mb-3'>
          Import i eksport
        </h2>
        <Card
          body
          className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 mb-4'
        >
          <h3 className='h5 mb-2'>Eksport danych konta</h3>
          <p className='text-body-secondary small'>
            Pobierz dane profilu (imię i nazwisko oraz e-mail), zapisane
            rachunki, dane stron, dane rachunku bankowego i historię wyborów
            cookies w pliku JSON. Eksport nie obejmuje dowodów akceptacji
            Regulaminu ani zgłoszeń kontaktowych. W sprawie dostępu do
            pozostałych danych skontaktuj się z administratorem zgodnie z
            Polityką prywatności.
          </p>
          <div>
            <Button href='/api/account/export' variant='outline-primary'>
              Pobierz moje dane
            </Button>
          </div>
        </Card>
        <ImportDataCard />
      </section>

      <section
        id='usun-konto'
        aria-labelledby='usun-konto-heading'
        className='border-top pt-4'
      >
        <DeleteAccountForm />
      </section>
    </Container>
  );
}
