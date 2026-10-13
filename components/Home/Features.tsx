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
  BsBriefcaseFill,
  BsCalculatorFill,
  BsClockHistory,
  BsEyeFill,
  BsFileEarmarkPdfFill,
  BsMortarboardFill,
  BsPercent,
  BsShieldCheck,
} from 'react-icons/bs';

interface FeatureItem {
  icon: IconType;
  badge: string;
  badgeBg: string;
  badgeText: string;
  title: string;
  text: string;
  href?: string;
  linkText?: string;
}

const features: FeatureItem[] = [
  {
    icon: BsCalculatorFill,
    badge: 'ZUS & PIT 2026',
    badgeBg: 'primary-subtle',
    badgeText: 'primary',
    title: 'Automatyczne składki ZUS i zaliczka PIT',
    text: 'Precyzyjnie wylicza składki emerytalne (9,76%), rentowe (1,50%), dobrowolne chorobowe (2,45%) oraz zdrowotne (9%). Posiada pełne wsparcie dla kwoty zmniejszającej podatek PIT-2 (300 zł, 150 zł, 100 zł).',
    href: '/help/podatki/kwota-zmniejszajaca-podatek-pit-2',
    linkText: 'Dowiedz się więcej o PIT-2',
  },
  {
    icon: BsMortarboardFill,
    badge: 'Brutto = Netto',
    badgeBg: 'success-subtle',
    badgeText: 'success',
    title: 'Uczniowie i studenci do 26. roku życia',
    text: 'Dla uczących się zleceniobiorców generator natychmiast zeruje składki ZUS oraz stosuje Ulgę dla Młodych (zerowy PIT). Całe wynagrodzenie brutto staje się kwotą netto do wypłaty bez zbędnych obliczeń.',
    href: '/help/zus/status-ucznia-i-studenta-do-26-lat',
    linkText: 'Zasady dla studentów',
  },
  {
    icon: BsBriefcaseFill,
    badge: 'Tylko zdrowotna 9%',
    badgeBg: 'info-subtle',
    badgeText: 'info-emphasis',
    title: 'Zbieg z umową o pracę (etatem)',
    text: 'Dla osób zatrudnionych na etacie z co najmniej minimalnym wynagrodzeniem generator odlicza wyłącznie 9% składki zdrowotnej, zwalniając z podwójnego opłacania ubezpieczeń społecznych.',
    href: '/help/zus/zbieg-tytulow-etat-i-zlecenie',
    linkText: 'Jak działa zbieg tytułów',
  },
  {
    icon: BsPercent,
    badge: 'KUP 20% lub 50%',
    badgeBg: 'warning-subtle',
    badgeText: 'warning-emphasis',
    title: 'Koszty autorskie 50% lub standardowe 20%',
    text: 'Wybierz podwyższone koszty uzyskania przychodu (50%) dla zleceń z przeniesieniem praw autorskich (twórcy, programiści, graficy) lub tradycyjne koszty 20% dla standardowych usług.',
    href: '/help/podatki/koszty-uzyskania-przychodu-20-vs-50',
    linkText: 'Koszty autorskie w praktyce',
  },
  {
    icon: BsClockHistory,
    badge: 'Min. 31,40 zł/h',
    badgeBg: 'danger-subtle',
    badgeText: 'danger',
    title: 'Stawka godzinowa z kontrolą minimalnej',
    text: 'Rozliczaj ryczałt miesięczny lub godziny pracy z automatycznym przeliczaniem. System na bieżąco weryfikuje zachowanie ustawowej minimalnej stawki godzinowej obowiązującej w 2026 r.',
    href: '/help/podstawy/minimalna-stawka-godzinowa',
    linkText: 'Minimalna stawka 2026',
  },
  {
    icon: BsFileEarmarkPdfFill,
    badge: 'Wektorowy PDF A4',
    badgeBg: 'primary-subtle',
    badgeText: 'primary',
    title: 'Podgląd w czasie rzeczywistym i eksport PDF',
    text: 'Wpisując dane, na bieżąco obserwujesz gotowy dokument na podzielonym ekranie. Następnie jednym kliknięciem pobierasz wektorowy, profesjonalny plik PDF gotowy do podpisu.',
    href: '/preview',
    linkText: 'Zobacz przykładowy wzór',
  },
];

export default function Features() {
  return (
    <section className='py-4 py-lg-5'>
      <Row className='justify-content-center mb-4 text-center'>
        <Col lg={8}>
          <div className='mb-2'>
            <Badge
              bg='primary-subtle'
              className='text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-medium d-inline-flex align-items-center gap-2'
            >
              <BsEyeFill />
              <span>Możliwości generatora</span>
            </Badge>
          </div>
          <h2 className='display-6 fw-bold text-body-emphasis'>
            Wszystko, czego potrzebujesz do rozliczenia zlecenia
          </h2>
          <p className='lead text-body-secondary mt-2 mb-0'>
            Zaprojektowany, aby zaoszczędzić Twój czas i wyeliminować błędy w
            rozliczeniach z urzędem skarbowym i ZUS.
          </p>
        </Col>
      </Row>

      <Row className='g-4'>
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Col md={6} lg={4} key={feature.title}>
              <Card className='h-100 border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 hover-elevate p-3 d-flex flex-column'>
                <CardBody className='d-flex flex-column p-2'>
                  <div className='d-flex align-items-center justify-content-between mb-3'>
                    <div
                      className='d-inline-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary'
                      style={{ width: 48, height: 48 }}
                    >
                      <Icon className='fs-4' />
                    </div>
                    <Badge
                      bg={feature.badgeBg}
                      className={`text-${feature.badgeText} border border-${feature.badgeBg} px-2 py-1 rounded-pill fw-medium small`}
                    >
                      {feature.badge}
                    </Badge>
                  </div>

                  <CardTitle
                    as='h3'
                    className='h5 fw-bold mb-2 text-body-emphasis'
                  >
                    {feature.title}
                  </CardTitle>

                  <CardText className='text-body-secondary small flex-grow-1 mb-3'>
                    {feature.text}
                  </CardText>

                  {feature.href && (
                    <div className='pt-2 border-top border-secondary-subtle'>
                      <Link
                        href={feature.href as never}
                        className='small text-decoration-none d-inline-flex align-items-center gap-1 fw-semibold text-primary'
                      >
                        <span>{feature.linkText}</span>
                        <BsArrowRight className='small' />
                      </Link>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div className='mt-4 p-3 p-md-4 rounded-4 border border-secondary-subtle bg-body-tertiary shadow-sm d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3'>
        <div className='d-flex align-items-center gap-3'>
          <div className='rounded-circle bg-success-subtle text-success p-3 d-inline-flex align-items-center justify-content-center flex-shrink-0'>
            <BsShieldCheck className='fs-3' />
          </div>
          <div>
            <h4 className='h6 fw-bold mb-1 text-body-emphasis'>
              Brak ukrytych opłat i gwarancja prywatności
            </h4>
            <p className='small text-body-secondary mb-0'>
              Wszystkie kalkulacje i generowanie PDF odbywają się w Twojej
              przeglądarce. Opcjonalne konto pozwala zapisywać dane
              zleceniodawców i historię rachunków.
            </p>
          </div>
        </div>
        <Link
          href='/generator'
          className='btn btn-primary rounded-pill px-4 text-nowrap align-self-start align-self-md-center'
        >
          Otwórz formularz
        </Link>
      </div>
    </section>
  );
}
