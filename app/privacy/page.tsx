import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Badge, Card, Container } from 'react-bootstrap';

export const metadata: Metadata = {
  title: 'Polityka prywatności',
};

export default async function PrivacyPage() {
  await connection();
  const { Content, version, effectiveDate } =
    getCurrentLegalDocument('privacy');
  const formattedPrivacyDate = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(`${effectiveDate}T12:00:00Z`));

  return (
    <Container className='py-5 page-wide'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4 p-md-5'
      >
        <h1 className='h3 mb-2 text-body-emphasis'>Polityka prywatności</h1>
        <div className='d-flex flex-wrap gap-2 mb-4'>
          <Badge bg='primary' pill className='terms-metadata-badge px-3 py-2'>
            Wersja {version}
          </Badge>
          <Badge bg='secondary' pill className='terms-metadata-badge px-3 py-2'>
            Obowiązuje od {formattedPrivacyDate}
          </Badge>
        </div>

        <Content />
      </Card>
    </Container>
  );
}
