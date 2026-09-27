import { Button, Col, Row } from 'react-bootstrap';

export default function Hero() {
  return (
    <section className={'py-3'}>
      <Row className='justify-content-center'>
        <Col lg={8} className={'text-center'}>
          <h1 className={'display-5 fw-bold mb-5'}>
            Generator rachunku do umowy zlecenia
          </h1>
          <p className={'lead mb-4'}>
            Wystawiasz rachunek do umowy zlecenia, a system sam wyliczy składki.
            Gotowy dokument pobierasz jako PDF do podpisu.
          </p>
          <div className={'d-flex justify-content-center gap-2 flex-wrap'}>
            <Button href={'/generator'} variant={'primary'} size={'lg'}>
              Otwórz generator
            </Button>
            <Button href={'/preview'} variant={'outline-secondary'} size={'lg'}>
              Zobacz wzór rachunku
            </Button>
          </div>
          <p className={'text-muted small mt-3'}>
            Darmowe narzędzie online. Nie wymaga rejestracji.
          </p>
        </Col>
      </Row>
    </section>
  );
}
