import { auth } from '@/lib/auth/server';
import { getCurrentLegalDocument } from '@/lib/legalDocuments';
import {
  claimPendingMagicLinkAcceptance,
  hasCurrentTermsAcceptance,
} from '@/lib/recordTermsAcceptance';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Alert, Card, Container } from 'react-bootstrap';
import AcceptanceForm from './AcceptanceForm';

export const metadata: Metadata = {
  title: 'Akceptacja Regulaminu',
  robots: { index: false, follow: false },
};

export default async function AcceptTermsPage() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/auth/sign-in');
  }

  if (session.user.email) {
    await claimPendingMagicLinkAcceptance(userId, session.user.email);
  }

  if (await hasCurrentTermsAcceptance(userId)) {
    redirect('/');
  }
  const { version } = getCurrentLegalDocument('terms');

  return (
    <Container className='py-5 page-narrow'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 p-sm-4'
      >
        <h1 className='h4 mb-3'>Zaakceptuj aktualny Regulamin</h1>
        <Alert variant='info'>
          Aby kontynuować korzystanie z Konta, potwierdź akceptację Regulaminu w
          wersji {version}. Zapiszemy informację o koncie, wersji dokumentu i
          czasie akceptacji.
        </Alert>
        <AcceptanceForm termsVersion={version} />
      </Card>
    </Container>
  );
}
