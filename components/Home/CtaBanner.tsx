import Link from 'next/link';
import { Badge, Col, Row } from 'react-bootstrap';
import {
  BsCalculatorFill,
  BsFillFileEarmarkTextFill,
  BsLightningChargeFill,
} from 'react-icons/bs';

export default function CtaBanner() {
  return (
    <section className='my-4 my-lg-5'>
      <div className='p-4 p-md-5 rounded-4 border border-primary-subtle bg-primary-subtle text-center shadow-sm'>
        <Row className='justify-content-center'>
          <Col lg={9} xl={8}>
            <div className='mb-3'>
              <Badge
                bg='primary'
                className='px-3 py-2 rounded-pill fw-medium d-inline-flex align-items-center gap-2'
              >
                <BsLightningChargeFill />
                <span>Błyskawiczne rozliczenie</span>
              </Badge>
            </div>

            <h2 className='display-6 fw-bold text-body-emphasis mb-3'>
              Wystaw rachunek do umowy zlecenia w minutę
            </h2>

            <p
              className='lead text-body-secondary mb-4 mx-auto'
              style={{ maxWidth: 640 }}
            >
              Wpisz kwotę, wybierz warunki umowy i pobierz gotowy plik PDF do
              podpisu. Bez opłat, bez zbędnych formalności i z gwarancją
              prawidłowych stawek na 2026 rok.
            </p>

            <div className='d-flex justify-content-center gap-3 flex-wrap'>
              <Link
                href='/generator'
                className='btn btn-primary btn-lg rounded-pill px-4 shadow-sm d-inline-flex align-items-center gap-2 fw-semibold'
              >
                <BsCalculatorFill aria-hidden />
                <span>Uruchom generator</span>
              </Link>
              <Link
                href='/preview'
                className='btn btn-outline-primary btn-lg rounded-pill px-4 d-inline-flex align-items-center gap-2 fw-semibold'
              >
                <BsFillFileEarmarkTextFill aria-hidden />
                <span>Zobacz wzór rachunku</span>
              </Link>
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
}
