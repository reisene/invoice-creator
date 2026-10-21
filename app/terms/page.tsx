import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Badge, Card, Container } from 'react-bootstrap';

export const metadata: Metadata = { title: 'Regulamin serwisu' };

export default async function TermsPage() {
  await connection();
  const { Content, version, effectiveDate } = getCurrentLegalDocument('terms');
  const termsEffectiveDate = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(`${effectiveDate}T12:00:00Z`));

  return (
    <Container className='py-5 page-wide'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4 p-md-5'
      >
        <h1 className='h3 mb-2 text-body-emphasis'>
          Regulamin serwisu Invoice Creator
        </h1>
        <div className='d-flex flex-wrap gap-2 mb-4'>
          <Badge bg='primary' pill className='terms-metadata-badge px-3 py-2'>
            Wersja {version}
          </Badge>
          <Badge bg='secondary' pill className='terms-metadata-badge px-3 py-2'>
            Obowiązuje od {termsEffectiveDate}
          </Badge>
        </div>

        <Content />
      </Card>
    </Container>
  );
}
