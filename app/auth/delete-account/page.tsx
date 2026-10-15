import { DeleteAccountForm } from '@/app/account/AccountForms';
import { auth } from '@/lib/auth/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Container } from 'react-bootstrap';

export const metadata: Metadata = { title: 'Usunięcie konta' };

export default async function DeleteAccountPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/auth/sign-in');

  return (
    <Container className='py-5 page-narrow'>
      <h1 className='h3 mb-3'>Usunięcie konta</h1>
      <p>Usunięcie konta nie wymaga akceptacji nowej wersji Regulaminu.</p>
      <DeleteAccountForm />
    </Container>
  );
}
