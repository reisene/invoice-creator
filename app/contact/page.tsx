import { auth } from '@/lib/auth/server';
import pkg from '@/package.json';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, Col, Container, Row } from 'react-bootstrap';
import {
  BsBoxArrowUpRight,
  BsBugFill,
  BsEnvelopeAtFill,
  BsGithub,
  BsHeartFill,
  BsHousesFill,
  BsPersonCircle,
} from 'react-icons/bs';
import { SiPatreon } from 'react-icons/si';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Kontakt i wsparcie projektu',
  description:
    'Skontaktuj się z twórcą generatora rachunków do umów zlecenia. Formularz kontaktowy, zgłaszanie błędów, wsparcie i repozytorium projektu.',
};

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  const repoUrl = pkg.repository.url
    .replace(/^git\+/, '')
    .replace(/\.git$/, '');

  const patreonFunding = pkg.funding?.find((f) => f.type === 'patreon');
  const githubFunding = pkg.funding?.find((f) => f.type === 'github');

  return (
    <Container className='py-5'>
      {/* Breadcrumb */}
      <nav aria-label='breadcrumb' className='mb-4'>
        <ol className='breadcrumb mb-0 small'>
          <li className='breadcrumb-item'>
            <Link
              href='/'
              className='text-decoration-none d-inline-flex align-items-center gap-1'
            >
              <BsHousesFill className='small' />
              <span>Start</span>
            </Link>
          </li>
          <li className='breadcrumb-item active' aria-current='page'>
            Kontakt
          </li>
        </ol>
      </nav>

      {/* Nagłówek */}
      <div className='mb-5'>
        <div className='d-inline-flex align-items-center gap-2 mb-2'>
          <Badge
            bg='primary-subtle'
            className='text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-medium'
          >
            <BsEnvelopeAtFill className='me-1' /> Kontakt &amp; Społeczność
          </Badge>
        </div>
        <h1 className='display-6 fw-bold text-body-emphasis mb-3'>
          Skontaktuj się z nami
        </h1>
        <p className='lead text-body-secondary mb-0' style={{ maxWidth: 750 }}>
          Masz pytanie dotyczące działania kalkulatora, zauważyłeś błąd w
          wyliczeniach podatkowych lub chcesz wesprzeć rozwój projektu? Napisz
          przez formularz lub skorzystaj z poniższych bezpośrednich kanałów.
        </p>
      </div>

      <Row className='g-4'>
        {/* Kolumna lewa: Dane z package.json */}
        <Col lg={5} className='d-flex flex-column gap-3'>
          {/* Autor i e-mail */}
          <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4'>
            <div className='d-flex align-items-center gap-3 mb-3'>
              <div className='p-2 rounded-circle bg-primary-subtle text-primary'>
                <BsPersonCircle size={28} />
              </div>
              <div>
                <h2 className='h5 fw-bold mb-0 text-body-emphasis'>
                  Autor i twórca projektu
                </h2>
                <span className='small text-body-secondary'>
                  Utrzymanie i rozwój aplikacji
                </span>
              </div>
            </div>
            <p className='text-body-secondary small mb-3'>
              Aplikacja <strong>{pkg.displayName || pkg.name}</strong> jest
              tworzona i utrzymywana jako darmowe narzędzie dla zleceniobiorców
              i przedsiębiorców.
            </p>
            <div className='p-3 rounded-3 bg-body border border-secondary-subtle'>
              <div className='small text-body-secondary mb-1'>Twórca:</div>
              <div className='fw-bold text-body-emphasis mb-2'>
                {pkg.author.name}
              </div>
              <div className='small text-body-secondary mb-1'>
                Adres e-mail:
              </div>
              <a
                href={`mailto:${pkg.author.email}`}
                className='text-primary text-decoration-none fw-semibold d-inline-flex align-items-center gap-1 font-monospace small'
              >
                <span>{pkg.author.email}</span>
              </a>
            </div>
          </Card>

          {/* Zgłaszanie problemów i Helpdesk */}
          <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4'>
            <div className='d-flex align-items-center gap-3 mb-3'>
              <div className='p-2 rounded-circle bg-warning-subtle text-warning-emphasis'>
                <BsBugFill size={28} />
              </div>
              <div>
                <h2 className='h5 fw-bold mb-0 text-body-emphasis'>
                  Błędy i uwagi techniczne
                </h2>
                <span className='small text-body-secondary'>
                  Issue Tracker &amp; Helpdesk
                </span>
              </div>
            </div>
            <p className='text-body-secondary small mb-3'>
              Jeśli kalkulator zachował się niezgodnie z przepisami lub masz
              uwagi techniczne do działania serwisu, zgłoś problem:
            </p>
            <div className='d-flex flex-column gap-2'>
              <a
                href={pkg.bugs.url}
                target='_blank'
                rel='noopener noreferrer'
                className='btn btn-outline-secondary d-flex align-items-center justify-content-between text-start py-2 px-3 rounded-3'
              >
                <div className='d-flex align-items-center gap-2'>
                  <BsGithub size={18} />
                  <div>
                    <div className='fw-semibold small'>GitHub Issues</div>
                    <div
                      className='text-body-secondary'
                      style={{ fontSize: '0.75rem' }}
                    >
                      Zgłoś błąd lub propozycję w repozytorium
                    </div>
                  </div>
                </div>
                <BsBoxArrowUpRight className='small text-body-secondary' />
              </a>

              <a
                href={`mailto:${pkg.bugs.email}`}
                className='btn btn-outline-secondary d-flex align-items-center justify-content-between text-start py-2 px-3 rounded-3'
              >
                <div className='d-flex align-items-center gap-2'>
                  <BsEnvelopeAtFill size={18} />
                  <div>
                    <div className='fw-semibold small'>E-mail serwisowy</div>
                    <div
                      className='text-body-secondary font-monospace'
                      style={{ fontSize: '0.75rem' }}
                    >
                      {pkg.bugs.email}
                    </div>
                  </div>
                </div>
                <BsBoxArrowUpRight className='small text-body-secondary' />
              </a>
            </div>
          </Card>

          {/* Wsparcie projektu (Funding) */}
          <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4'>
            <div className='d-flex align-items-center gap-3 mb-3'>
              <div className='p-2 rounded-circle bg-danger-subtle text-danger'>
                <BsHeartFill size={28} />
              </div>
              <div>
                <h2 className='h5 fw-bold mb-0 text-body-emphasis'>
                  Wsparcie projektu
                </h2>
                <span className='small text-body-secondary'>
                  Darowizny i sponsoring
                </span>
              </div>
            </div>
            <p className='text-body-secondary small mb-3'>
              Projekt nie wyświetla reklam i jest w 100% darmowy. Jeśli
              narzędzie ułatwiło Ci pracę, możesz wesprzeć serwery i dalszy
              rozwój:
            </p>
            <div className='d-flex flex-column gap-2'>
              {patreonFunding && (
                <a
                  href={patreonFunding.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn btn-outline-danger d-flex align-items-center justify-content-between py-2 px-3 rounded-3 text-start'
                >
                  <div className='d-flex align-items-center gap-2'>
                    <SiPatreon size={18} />
                    <div className='fw-semibold small'>Patreon: draugskoll</div>
                  </div>
                  <BsBoxArrowUpRight className='small' />
                </a>
              )}

              {githubFunding && (
                <a
                  href={githubFunding.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn btn-outline-secondary d-flex align-items-center justify-content-between py-2 px-3 rounded-3 text-start'
                >
                  <div className='d-flex align-items-center gap-2'>
                    <BsGithub size={18} />
                    <div className='fw-semibold small'>
                      GitHub Sponsors: reisene
                    </div>
                  </div>
                  <BsBoxArrowUpRight className='small' />
                </a>
              )}
            </div>
          </Card>

          {/* Kod źródłowy i strona */}
          <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4'>
            <h2 className='h6 fw-bold mb-2 text-body-emphasis d-flex align-items-center gap-2'>
              <BsGithub /> Repozytorium i dokumentacja
            </h2>
            <p className='text-body-secondary small mb-3'>
              Przejrzyj kod źródłowy, śledź zmiany i czytaj dokumentację
              projektu na platformie GitHub:
            </p>
            <div className='d-flex flex-wrap gap-2'>
              <a
                href={repoUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='btn btn-sm btn-outline-secondary rounded-pill d-inline-flex align-items-center gap-1'
              >
                <span>Repozytorium GitHub</span>
                <BsBoxArrowUpRight className='small' />
              </a>
              <a
                href={`${repoUrl}#readme`}
                target='_blank'
                rel='noopener noreferrer'
                className='btn btn-sm btn-outline-secondary rounded-pill d-inline-flex align-items-center gap-1'
              >
                <span>Dokumentacja README</span>
                <BsBoxArrowUpRight className='small' />
              </a>
            </div>
          </Card>
        </Col>

        {/* Kolumna prawa: Formularz kontaktowy */}
        <Col lg={7}>
          <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4 p-md-5'>
            <div className='mb-4'>
              <h2 className='h4 fw-bold text-body-emphasis mb-2'>
                Formularz kontaktowy
              </h2>
              <p className='text-body-secondary mb-0'>
                Wypełnij poniższe pola, a my skontaktujemy się z Tobą na
                wskazany adres e-mail.
              </p>
            </div>

            <ContactForm
              defaultName={user?.name ?? ''}
              defaultEmail={user?.email ?? ''}
            />
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
