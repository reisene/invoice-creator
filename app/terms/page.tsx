import type { Metadata } from 'next';
import { Card, Container } from 'react-bootstrap';

export const metadata: Metadata = { title: 'Regulamin' };

export default function TermsPage() {
  return (
    <Container className='py-5 page-wide'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4 p-md-5'
      >
        <h1 className='h3 mb-3 text-body-emphasis'>Regulamin serwisu</h1>
        <p className='lead text-muted mb-3'>Strona w przygotowaniu.</p>
        <p className='text-body-secondary mb-0'>
          Ta wersja jest tymczasowym placeholderem i nie stanowi kompletnego
          regulaminu. Zasady korzystania z serwisu zostaną uzupełnione przed
          publikacją właściwego regulaminu.
        </p>
      </Card>
    </Container>
  );
}
