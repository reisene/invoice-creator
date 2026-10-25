import ClearCookieConsentButton from '@/components/consent/ClearCookieConsentButton';
import { auth } from '@/lib/auth/server';
import {
  COOKIE_CONSENT_COOKIE,
  allowsAnalytics,
  allowsReplay,
  getCookieConsentLabel,
  getCookieConsentLogCutoff,
  parseCookieConsentCookie,
} from '@/lib/cookieConsent';
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Badge, Card, CardBody, Container, Table } from 'react-bootstrap';

export const metadata: Metadata = { title: 'Ustawienia cookies' };
export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(date);
}

export default async function CookieSettingsPage() {
  const cookieStore = await cookies();
  const currentChoice = parseCookieConsentCookie(
    cookieStore.get(COOKIE_CONSENT_COOKIE)?.value,
  );
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  const history = userId
    ? await prisma.cookieConsent.findMany({
        where: {
          userId,
          createdAt: { gte: getCookieConsentLogCutoff() },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          choice: true,
          consentVersion: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <Container className='py-4 page-medium'>
      <h1 className='mb-2'>Ustawienia cookies</h1>
      <p className='text-body-secondary mb-4'>
        Sprawdź używane cookies i zapisane decyzje. Zmianę bieżącego wyboru
        możesz zrobić w dowolnym momencie za pomocą pływającego przycisku
        „Cookies”.
      </p>

      <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 mb-4'>
        <CardBody className='p-4'>
          <h2 className='h5'>Bieżący wybór na tym urządzeniu</h2>
          {currentChoice ? (
            <p className='mb-0'>
              <Badge bg='secondary'>
                {getCookieConsentLabel(currentChoice)}
              </Badge>
            </p>
          ) : (
            <p className='mb-0 text-body-secondary'>
              Brak aktualnego wyboru na tym urządzeniu. Opcjonalna analityka,
              pomiary wydajności i odtwarzanie sesji są wyłączone.
            </p>
          )}
          <ClearCookieConsentButton hasChoice={currentChoice !== null} />
        </CardBody>
      </Card>

      <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 mb-4'>
        <CardBody className='p-4'>
          <h2 className='h5'>Cookies i pamięć przeglądarki</h2>
          <Table bordered responsive className='align-middle mb-0'>
            <thead>
              <tr>
                <th scope='col'>Nazwa / kategoria</th>
                <th scope='col'>Cel i czas przechowywania</th>
                <th scope='col'>Stan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope='row'>
                  <code>__Secure-neon-auth.session_token</code>
                </th>
                <td>Uwierzytelnianie konta; czas sesji Neon Auth.</td>
                <td>Niezbędne</td>
              </tr>
              <tr>
                <th scope='row'>
                  <code>__Secure-neon-auth.local.session_data</code>
                </th>
                <td>
                  Obsługa sesji uwierzytelnienia; czas ważności sesji Neon Auth.
                </td>
                <td>Niezbędne</td>
              </tr>
              <tr>
                <th scope='row'>
                  <code>{COOKIE_CONSENT_COOKIE}</code>
                </th>
                <td>Zapamiętanie wyboru cookies; 12 miesięcy.</td>
                <td>Niezbędne</td>
              </tr>
              <tr>
                <th scope='row'>Vercel Web Analytics i Speed Insights</th>
                <td>
                  Opcjonalne statystyki odwiedzin i pomiary wydajności, bez
                  cookies tych narzędzi. Aplikacja pomija prywatne ścieżki oraz
                  usuwa parametry zapytania i fragmenty adresów.
                </td>
                <td>
                  {allowsAnalytics(currentChoice) ? 'Włączone' : 'Wyłączone'}
                </td>
              </tr>
              <tr>
                <th scope='row'>Sentry Replay</th>
                <td>
                  Opcjonalne odtwarzanie interakcji z maskowaniem tekstu i pól
                  oraz blokowaniem multimediów. Korzysta z pamięci sesyjnej
                  przeglądarki do obsługi nagrania; wycofanie zgody zatrzymuje
                  dalsze nagrywanie.
                </td>
                <td>
                  {allowsReplay(currentChoice) ? 'Włączone' : 'Wyłączone'}
                </td>
              </tr>
              <tr>
                <th scope='row'>Diagnostyka Sentry i ochrona BotID</th>
                <td>
                  Raporty błędów i diagnostyka techniczna Sentry oraz
                  weryfikacja antyspamowa formularza kontaktowego. Działają
                  niezależnie od opcjonalnych pomiarów; nie są zgodą na Replay.
                </td>
                <td>Diagnostyka i bezpieczeństwo</td>
              </tr>
              <tr>
                <th scope='row'>Pamięć sesyjna przeglądarki</th>
                <td>
                  Dane robocze podglądu generatora; usuwane po zakończeniu sesji
                  przeglądarki.
                </td>
                <td>Funkcjonalność Serwisu</td>
              </tr>
            </tbody>
          </Table>
          <p className='small text-body-secondary mt-3 mb-0'>
            Obie opcjonalne kategorie można włączać i wyłączać niezależnie.
            Odmowa nie ogranicza dostępu do Serwisu. Nie używamy narzędzi
            reklamowych. Usunięcie wyboru wyłącza opcjonalne narzędzia po
            przeładowaniu strony, ale nie usuwa wcześniej przesłanych danych.
          </p>
        </CardBody>
      </Card>

      <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4'>
        <CardBody className='p-4'>
          <h2 className='h5'>Historia zapisanych decyzji</h2>
          <p className='text-body-secondary'>
            Wpisy są przechowywane przez 30 dni. Rejestrowane są decyzje
            dokonane po zalogowaniu do tego Konta.
          </p>
          {!userId ? (
            <p className='mb-0'>
              Zaloguj się, aby wyświetlić decyzje zapisane dla Konta. Decyzje
              podjęte bez logowania są zapisywane w cookie tej przeglądarki oraz
              w rejestrze bez identyfikatora Konta. Nie są później automatycznie
              przypisywane do Konta.
            </p>
          ) : history.length === 0 ? (
            <p className='mb-0 text-body-secondary'>
              Brak decyzji zapisanych dla tego Konta w ostatnich 30 dniach.
            </p>
          ) : (
            <>
              <Table bordered responsive className='align-middle mb-2'>
                <thead>
                  <tr>
                    <th scope='col'>Data i czas</th>
                    <th scope='col'>Decyzja</th>
                    <th scope='col'>Wersja</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <time dateTime={item.createdAt.toISOString()}>
                          {formatDate(item.createdAt)}
                        </time>
                      </td>
                      <td>{getCookieConsentLabel(item.choice)}</td>
                      <td>{item.consentVersion}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {history.length === 100 && (
                <p className='small text-body-secondary mb-0'>
                  Wyświetlono 100 ostatnich decyzji.
                </p>
              )}
            </>
          )}
          <p className='small mt-3 mb-0'>
            Szczegóły przetwarzania danych opisuje{' '}
            <Link href='/privacy#cookies'>Polityka prywatności</Link>.
          </p>
        </CardBody>
      </Card>
    </Container>
  );
}
