import { Card, CardBody, CardText, CardTitle, Col, Row } from 'react-bootstrap';
import type { IconType } from 'react-icons';
import { BsCalculator, BsDownload, BsPencil } from 'react-icons/bs';

const steps: { icon: IconType; title: string; text: string }[] = [
  {
    icon: BsPencil,
    title: 'Wypełniasz dane umowy i wynagrodzenie',
    text:
      'Podajesz dane zleceniodawcy i zleceniobiorcy, numer i datę umowy, ' +
      'okres rozliczeniowy oraz kwotę brutto.',
  },
  {
    icon: BsCalculator,
    title: 'System wylicza składki i podatek',
    text:
      'Generator automatycznie oblicza składki ZUS, koszty uzyskania przychodu ' +
      'i zaliczkę na PIT, w zależności od twojego statusu (student, zbieg z etatem, zwykłe zlecenie)',
  },
  {
    icon: BsDownload,
    title: 'Pobierasz gotowy rachunek',
    text:
      'Otrzymujesz przejrzysty rachunek w postaci PDF, który drukujesz ' +
      'w dwóch egzemplarzach i podpisujesz wraz ze zleceniodawcą.',
  },
];

export default function HowItWorks() {
  return (
    <section className={'py-3'}>
      <Row className='justify-content-center mb-4'>
        <Col lg={8} className={'text-center'}>
          <h2 className={'fw-bold'}>Jak to działa?</h2>
        </Col>
      </Row>

      <Row className='g-4'>
        {steps.map((step, index) => {
          const Icon: IconType = step.icon;

          return (
            <Col md={4} key={index}>
              <Card className={'h-100 border-0 shadow-sm'}>
                <CardBody className={'text-center'}>
                  <Icon className={'mb-3 fs-3 text-primary'} />
                  <CardTitle as={'h3'} className={'fw-bold mb-2'}>
                    {step.title}
                  </CardTitle>
                  <CardText className={'text-muted'}>{step.text}</CardText>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>
    </section>
  );
}
