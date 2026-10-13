import Link from 'next/link';
import {
  Badge,
  Card,
  CardBody,
  CardText,
  CardTitle,
  Col,
  Row,
} from 'react-bootstrap';
import type { IconType } from 'react-icons';
import {
  BsArrowRight,
  BsCalculatorFill,
  BsFileEarmarkPdfFill,
  BsPencilSquare,
} from 'react-icons/bs';

const steps: {
  icon: IconType;
  stepNumber: string;
  title: string;
  text: string;
}[] = [
  {
    icon: BsPencilSquare,
    stepNumber: 'Krok 1',
    title: 'Wprowadzasz dane umowy i wynagrodzenie',
    text: 'Wpisujesz dane zleceniodawcy i zleceniobiorcy, wybierasz rozliczenie ryczałtowe lub stawkę godzinową oraz zaznaczasz swój status ubezpieczeniowy (standard, student lub etat).',
  },
  {
    icon: BsCalculatorFill,
    stepNumber: 'Krok 2',
    title: 'Generator przelicza składki na żywo',
    text: 'Silnik natychmiast kalkuluje składki emerytalne, rentowe, chorobowe, zdrowotne oraz zaliczkę PIT (z uwzględnieniem KUP 20% / 50% i ulg). Gotowy arkusz widzisz na podglądzie.',
  },
  {
    icon: BsFileEarmarkPdfFill,
    stepNumber: 'Krok 3',
    title: 'Pobierasz gotowy rachunek w formacie PDF',
    text: 'Generujesz profesjonalny, wektorowy plik PDF w standardzie A4. Drukujesz go w dwóch egzemplarzach do podpisu lub zapisujesz w historii swojego profilu użytkownika.',
  },
];

export default function HowItWorks() {
  return (
    <section className='py-4 py-lg-5'>
      <Row className='justify-content-center mb-4 text-center'>
        <Col lg={8}>
          <div className='mb-2'>
            <Badge
              bg='primary-subtle'
              className='text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-medium'
            >
              Prosty proces
            </Badge>
          </div>
          <h2 className='display-6 fw-bold text-body-emphasis'>
            Jak działa generator rachunku?
          </h2>
          <p className='lead text-body-secondary mt-2 mb-0'>
            Trzy proste kroki dzielą Cię od kompletnego, zgodnego z przepisami
            rachunku do umowy zlecenia.
          </p>
        </Col>
      </Row>

      <Row className='g-4'>
        {steps.map((step) => {
          const Icon: IconType = step.icon;

          return (
            <Col md={4} key={step.stepNumber}>
              <Card className='h-100 border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 hover-elevate'>
                <CardBody className='text-center p-4 d-flex flex-column'>
                  <div
                    className='mx-auto mb-3 d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary'
                    style={{ width: 56, height: 56 }}
                  >
                    <Icon className='fs-4' />
                  </div>
                  <div className='small text-primary fw-bold mb-1 text-uppercase letter-spacing-1'>
                    {step.stepNumber}
                  </div>
                  <CardTitle
                    as='h3'
                    className='h5 fw-bold mb-2 text-body-emphasis'
                  >
                    {step.title}
                  </CardTitle>
                  <CardText className='text-body-secondary small flex-grow-1 mb-0'>
                    {step.text}
                  </CardText>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div className='text-center mt-4'>
        <Link
          href='/generator'
          className='btn btn-outline-primary rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2 fw-medium'
        >
          <span>Rozpocznij wypełnianie rachunku</span>
          <BsArrowRight />
        </Link>
      </div>
    </section>
  );
}
