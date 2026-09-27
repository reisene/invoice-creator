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
              <Card className={'h-100 border-0 shadow-sm'}>
                <CardBody className={'text-center'}>
                  <Icon className={'mb-3 fs-3 text-primary'} />
                  <CardTitle as={'h3'} className={'fw-bold mb-2'}>
                    {tool.title}
                  </CardTitle>
                  <CardText className={'text-muted flex-grow-1'}>
                    {tool.text}
                  </CardText>
                  <Button
                    href={tool.href}
                    variant={'outline-primary'}
                    className={'mt-3'}
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
