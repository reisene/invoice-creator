import {
  Button,
  Card,
  CardBody,
  CardText,
  CardTitle,
  Col,
  Row,
} from 'react-bootstrap';
import type { IconType } from 'react-icons';
import {
  BsCalculator,
  BsFileEarmarkText,
  BsQuestionCircle,
} from 'react-icons/bs';

const tools: {
  icon: IconType;
  title: string;
  text: string;
  href: string;
  label: string;
}[] = [
  {
    icon: BsCalculator,
    title: 'Generator rachunku',
    text:
      'Wypełnij formularz i wygeneruj rachunek do umowy zlecenia ' +
      'z automatycznym wyliczeniem składek i podatku.',
    href: '/generator',
    label: 'Otwórz',
  },
  {
    icon: BsFileEarmarkText,
    title: 'Wzór / podgląd rachunku',
    text:
      'Zobacz, jak wygląda poprawny rachunek do umowy zlecenia ' +
      'i jakie dane musi zawierać.',
    href: '/preview',
    label: 'Zobacz',
  },
  {
    icon: BsQuestionCircle,
    title: 'Instrukcja / pomoc',
    text:
      'Krótki przewodnik, jak wypełnić rachunek ' +
      'i rozliczyć umowę zlecenia.',
    href: '/help',
    label: 'Sprawdź',
  },
];

export default function Tools() {
  return (
    <section className={'py-3'}>
      <Row className={'justify-content-center mb-4'}>
        <Col lg={8} className={'text-center'}>
          <h2 className={'fw-bold'}>Narzędzia</h2>
        </Col>
      </Row>

      <Row className={'g-4'}>
        {tools.map((tool) => {
          const Icon: IconType = tool.icon;
          return (
            <Col md={4} key={tool.href}>
              <Card
                className={
                  'h-100 border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 hover-elevate'
                }
              >
                <CardBody className={'text-center p-4 d-flex flex-column'}>
                  <div
                    className={
                      'mx-auto mb-3 d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary'
                    }
                    style={{ width: 56, height: 56 }}
                  >
                    <Icon className={'fs-4'} />
                  </div>
                  <CardTitle
                    as={'h3'}
                    className={'h5 fw-bold mb-2 text-body-emphasis'}
                  >
                    {tool.title}
                  </CardTitle>
                  <CardText className={'text-body-secondary small flex-grow-1'}>
                    {tool.text}
                  </CardText>
                  <Button
                    href={tool.href}
                    variant={'outline-primary'}
                    className={'mt-3 rounded-pill'}
                  >
                    {tool.label}
                  </Button>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>
    </section>
  );
}
