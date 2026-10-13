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
import {
  BsArrowRight,
  BsBookFill,
  BsBriefcaseFill,
  BsClockHistory,
  BsMortarboardFill,
  BsPercent,
} from 'react-icons/bs';

const featuredArticles = [
  {
    icon: BsClockHistory,
    title: 'Minimalna stawka godzinowa w 2026 r.',
    desc: 'Sprawdź, ile wynosi ustawowa stawka minimalna (31,40 zł/h), jak prowadzić ewidencję godzin i kogo obowiązuje.',
    category: 'Podstawy i prawo',
    href: '/help/podstawy/minimalna-stawka-godzinowa',
  },
  {
    icon: BsMortarboardFill,
    title: 'Status ucznia i studenta do 26 lat',
    desc: 'Kompletne zwolnienie ze składek ZUS oraz zerowy PIT. Jak legalnie otrzymać 100% kwoty brutto na rękę.',
    category: 'Składki ZUS',
    href: '/help/zus/status-ucznia-i-studenta-do-26-lat',
  },
  {
    icon: BsBriefcaseFill,
    title: 'Zbieg tytułów: etat i zlecenie',
    desc: 'Pracujesz na etacie i dorabiasz na zleceniu? Sprawdź, kiedy ze zlecenia odprowadzasz tylko składkę zdrowotną 9%.',
    category: 'Składki ZUS',
    href: '/help/zus/zbieg-tytulow-etat-i-zlecenie',
  },
  {
    icon: BsPercent,
    title: 'Koszty autorskie 50% vs 20%',
    desc: 'Kiedy przysługują 50% koszty uzyskania przychodu i jak rozliczyć prawa autorskie programisty, grafika lub twórcy.',
    category: 'Podatki i PIT',
    href: '/help/podatki/koszty-uzyskania-przychodu-20-vs-50',
  },
];

export default function HelpArticlesSection() {
  return (
    <section className='py-4 py-lg-5'>
      <Row className='justify-content-center mb-4 text-center'>
        <Col lg={8}>
          <div className='mb-2'>
            <Badge
              bg='primary-subtle'
              className='text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-medium d-inline-flex align-items-center gap-2'
            >
              <BsBookFill />
              <span>Poradnik i Baza wiedzy</span>
            </Badge>
          </div>
          <h2 className='display-6 fw-bold text-body-emphasis'>
            Najczęściej zadawane pytania i przepisy
          </h2>
          <p className='lead text-body-secondary mt-2 mb-0'>
            Przygotowaliśmy rzetelne poradniki wyjaśniające zawiłości rozliczeń,
            składek ZUS i podatku dochodowego.
          </p>
        </Col>
      </Row>

      <Row className='g-4'>
        {featuredArticles.map((article) => {
          const Icon = article.icon;
          return (
            <Col md={6} key={article.href}>
              <Card className='h-100 border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 hover-elevate p-3'>
                <CardBody className='d-flex flex-column p-2'>
                  <div className='d-flex align-items-center justify-content-between mb-3'>
                    <div
                      className='d-inline-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary'
                      style={{ width: 44, height: 44 }}
                    >
                      <Icon className='fs-5' />
                    </div>
                    <span className='small text-body-secondary fw-medium'>
                      {article.category}
                    </span>
                  </div>

                  <CardTitle
                    as='h3'
                    className='h5 fw-bold mb-2 text-body-emphasis'
                  >
                    {article.title}
                  </CardTitle>

                  <CardText className='text-body-secondary small flex-grow-1 mb-3'>
                    {article.desc}
                  </CardText>

                  <div>
                    <Link
                      href={article.href as never}
                      className='small text-decoration-none d-inline-flex align-items-center gap-1 fw-semibold text-primary'
                    >
                      <span>Przeczytaj poradnik</span>
                      <BsArrowRight className='small' />
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div className='text-center mt-4'>
        <Link
          href='/help'
          className='btn btn-outline-secondary rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2 fw-medium'
        >
          <span>Zobacz wszystkie artykuły w Bazie wiedzy</span>
          <BsArrowRight />
        </Link>
      </div>
    </section>
  );
}
