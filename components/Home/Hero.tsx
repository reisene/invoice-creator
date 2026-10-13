import HeroSimulator from '@/components/Home/HeroSimulator';
import Link from 'next/link';
import { Col, Row } from 'react-bootstrap';
import {
  BsCalculatorFill,
  BsCheckCircleFill,
  BsFillFileEarmarkTextFill,
  BsShieldCheck,
} from 'react-icons/bs';

export default function Hero() {
  return (
    <section className='py-4 py-lg-5'>
      <Row className='align-items-center g-4 g-lg-5'>
        <Col lg={7}>
          <div className='mb-3'>
            <span className='badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-medium d-inline-flex align-items-center gap-2'>
              <BsCheckCircleFill className='text-primary' />
              <span>
                Aktualne stawki i przepisy na rok 2026 (min. 31,40 zł/h)
              </span>
            </span>
          </div>

          <h1 className='display-5 fw-bold mb-3 text-body-emphasis'>
            Generator rachunku do umowy zlecenia online
          </h1>

          <p className='lead text-body-secondary mb-4'>
            Wystawiaj profesjonalne rachunki do umowy zlecenia w minutę. System
            samodzielnie wyliczy składki ZUS, koszty autorskie i zaliczkę PIT, a
            gotowy dokument w ułamku sekundy pobierzesz jako gotowy do podpisu
            plik PDF.
          </p>

          <ul className='list-unstyled d-flex flex-column gap-2 mb-4 text-body-secondary'>
            <li className='d-flex align-items-center gap-2'>
              <BsCheckCircleFill className='text-success flex-shrink-0' />
              <span>
                <strong>100% bezpłatny</strong> i bez konieczności rejestracji
              </span>
            </li>
            <li className='d-flex align-items-center gap-2'>
              <BsCheckCircleFill className='text-success flex-shrink-0' />
              <span>
                Obsługa <strong>studentów &lt; 26 lat</strong> (brutto = netto),
                zbiegu z etatem i <strong>KUP 50%</strong>
              </span>
            </li>
            <li className='d-flex align-items-center gap-2'>
              <BsCheckCircleFill className='text-success flex-shrink-0' />
              <span>
                <strong>Podgląd na żywo</strong> oraz wektorowy eksport do druku
                A4
              </span>
            </li>
          </ul>

          <div className='d-flex gap-3 flex-wrap align-items-center'>
            <Link
              href='/generator'
              className='btn btn-primary btn-lg rounded-pill d-inline-flex align-items-center gap-2 px-4 shadow-sm'
            >
              <BsCalculatorFill aria-hidden />
              <span>Otwórz generator</span>
            </Link>
            <Link
              href='/preview'
              className='btn btn-outline-secondary btn-lg rounded-pill d-inline-flex align-items-center gap-2 px-4'
            >
              <BsFillFileEarmarkTextFill aria-hidden />
              <span>Zobacz wzór</span>
            </Link>
          </div>

          <div className='d-flex align-items-center gap-2 text-muted small mt-4'>
            <BsShieldCheck className='text-primary fs-5 flex-shrink-0' />
            <span>
              Prywatność przede wszystkim: Twoje dane finansowe są przetwarzane
              wyłącznie w Twojej przeglądarce.
            </span>
          </div>
        </Col>

        <Col lg={5}>
          <HeroSimulator />
        </Col>
      </Row>
    </section>
  );
}
