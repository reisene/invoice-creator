import { Col, ListGroup, ListGroupItem, Row } from 'react-bootstrap';

const items: string[] = [
  'Dane zleceniodawcy i zleceniobiorcy (imię i nazwisko / nazwa, adres, NIP/PESEL)',
  'Numer i data umowy zlecenia oraz okres rozliczeniowy',
  'Kwota brutto wynagrodzenia',
  'Potrącenia: składki ZUS, koszty uzyskania przychodu, zaliczka na PIT',
  'Kwota netto do wypłaty',
  'Data, miejsce wystawienia i podpisy obu stron',
];

export default function InvoiceContent() {
  return (
    <section className={'py-3'}>
      <Row className={'justify-content-center mb-4'}>
        <Col lg={8} className={'text-center'}>
          <h2 className={'fw-bold'}>Co zawiera rachunek?</h2>
        </Col>
      </Row>

      <Row className={'g-4 align-items-center'}>
        <Col lg={6}>
          <ListGroup variant={'flush'} as={'ol'} numbered className='rounded-3'>
            {items.map((item) => (
              <ListGroupItem
                key={item}
                as={'li'}
                className='bg-transparent text-body border-secondary-subtle py-2 px-0'
              >
                {item}
              </ListGroupItem>
            ))}
          </ListGroup>
        </Col>

        <Col lg={6}>
          <div className='p-4 border border-secondary-subtle bg-body-tertiary rounded-4 shadow-sm'>
            <h3 className='h5 fw-bold mb-2 text-body-emphasis'>
              Wymogi formalne i wersje dla stron
            </h3>
            <p className={'text-body-secondary mb-0'}>
              Rachunek do umowy zlecenia wystawia się w dwóch jednobrzmiących
              egzemplarzach – jeden dla zleceniodawcy, drugi dla zleceniobiorcy.
              Dokument podpisują obie strony, co potwierdza wykonanie usługi i
              akceptację warunków rozliczenia.
            </p>
          </div>
        </Col>
      </Row>
    </section>
  );
}
