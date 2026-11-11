import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import { Card, CardBody, CardText, CardTitle, Col, Row } from 'react-bootstrap';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AdminPage() {
  const [
    invoicesCount,
    contactMessagesCount,
    termsAcceptancesCount,
    cookieConsentsCount,
    taxParamsCount,
  ] = await Promise.all([
    prisma.invoice.count(),
    prisma.contactMessage.count(),
    prisma.termsAcceptance.count(),
    prisma.cookieConsent.count(),
    prisma.taxParam.count(),
  ]);

  return (
    <>
      <div className='mb-4'>
        <h1 className='mb-2'>Panel administratora</h1>
        <p className='text-body-secondary mb-0'>
          Podstawowe statystyki aplikacji.
        </p>
      </div>

      <section aria-labelledby='admin-stats-heading'>
        <h2 id='admin-stats-heading' className='h4 mb-3'>
          Podsumowanie
        </h2>

        <Row className='g-3'>
          <Col md={6} xl={3}>
            <Card className='h-100 border-secondary-subtle shadow-sm'>
              <CardBody>
                <CardTitle className='h6 text-body-secondary'>
                  Faktury
                </CardTitle>
                <CardText className='display-6 mb-0'>{invoicesCount}</CardText>
              </CardBody>
            </Card>
          </Col>

          <Col md={6} xl={3}>
            <Card className='h-100 border-secondary-subtle shadow-sm'>
              <CardBody>
                <CardTitle className='h6 text-body-secondary'>
                  Wiadomości kontaktowe
                </CardTitle>
                <CardText className='display-6 mb-0'>
                  {contactMessagesCount}
                </CardText>
              </CardBody>
            </Card>
          </Col>

          <Col md={6} xl={3}>
            <Card className='h-100 border-secondary-subtle shadow-sm'>
              <CardBody>
                <CardTitle className='h6 text-body-secondary'>
                  Zgody regulaminowe
                </CardTitle>
                <CardText className='display-6 mb-0'>
                  {termsAcceptancesCount}
                </CardText>
              </CardBody>
            </Card>
          </Col>

          <Col md={6} xl={3}>
            <Card className='h-100 border-secondary-subtle shadow-sm'>
              <CardBody>
                <CardTitle className='h6 text-body-secondary'>
                  Zgody cookies
                </CardTitle>
                <CardText className='display-6 mb-0'>
                  {cookieConsentsCount}
                </CardText>
              </CardBody>
            </Card>
          </Col>

          <Col md={6} xl={3}>
            <Card className='h-100 border-secondary-subtle shadow-sm'>
              <CardBody>
                <CardTitle className='h6 text-body-secondary'>
                  Parametry podatkowe
                </CardTitle>
                <CardText className='display-6 mb-0'>{taxParamsCount}</CardText>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </section>
    </>
  );
}
