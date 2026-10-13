import { Button, Col, Row } from 'react-bootstrap';
import {
  BsCalculatorFill,
  BsCheckCircleFill,
  BsFillFileEarmarkTextFill,
} from 'react-icons/bs';

export default function Hero() {
  return (
    <section className={'py-4'}>
      <Row className='justify-content-center'>
        <Col lg={9} xl={8} className={'text-center'}>
          <div className='mb-3'>
            <span className='badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-medium d-inline-flex align-items-center gap-2'>
              <BsCheckCircleFill className='text-primary' />
              <span>Zgodne ze stawkami i przepisami na rok 2026</span>
            </span>
          </div>
          <h1 className={'display-5 fw-bold mb-3 text-body-emphasis'}>
            Generator rachunku do umowy zlecenia
          </h1>
          <p
            className={'lead text-body-secondary mb-4 mx-auto'}
            style={{ maxWidth: 640 }}
          >
            Wystawiasz rachunek do umowy zlecenia, a system sam wyliczy składki,
            koszty i podatek. Gotowy dokument pobierasz natychmiast jako PDF do
            podpisu.
          </p>
          <div className={'d-flex justify-content-center gap-3 flex-wrap'}>
            <Button
              href={'/generator'}
              variant={'primary'}
              size={'lg'}
              className='d-inline-flex align-items-center gap-2 px-4 shadow-sm'
            >
              <BsCalculatorFill aria-hidden />
              Otwórz generator
            </Button>
            <Button
              href={'/preview'}
              variant={'outline-secondary'}
              size={'lg'}
              className='d-inline-flex align-items-center gap-2 px-4'
            >
              <BsFillFileEarmarkTextFill aria-hidden />
              Zobacz wzór rachunku
            </Button>
          </div>
          <p className={'text-muted small mt-3 mb-0'}>
            Darmowe narzędzie online. Działa bez rejestracji i bez zbędnych
            formalności.
          </p>
        </Col>
      </Row>
    </section>
  );
}
