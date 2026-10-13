import { TERMS_LAST_MODIFIED, TERMS_VERSION } from '@/lib/termsAcceptance';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Card, Container } from 'react-bootstrap';

export const metadata: Metadata = { title: 'Regulamin serwisu' };

function ServiceAddress() {
  const siteUrl =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();

  return siteUrl ? <a href={siteUrl}>{siteUrl}</a> : null;
}

function ContactEmail() {
  const contactEmail = process.env.CONTACT_REPLY_TO?.trim();

  return contactEmail ? (
    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
  ) : null;
}
const termsLastModified = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'long',
  timeZone: 'Europe/Warsaw',
}).format(TERMS_LAST_MODIFIED);

export default async function TermsPage() {
  await connection();

  const serviceProviderName = process.env.SERVICE_PROVIDER_NAME?.trim() ?? '';
  const serviceProviderAddress =
    process.env.SERVICE_PROVIDER_ADDRESS?.trim() ?? '';

  return (
    <Container className='py-5 page-wide'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4 p-md-5'
      >
        <h1 className='h3 mb-2 text-body-emphasis'>
          Regulamin serwisu Invoice Creator
        </h1>
        <p className='text-body-secondary mb-4'>
          Wersja: <strong>{TERMS_VERSION}</strong>. Data wejścia w życie:{' '}
          <strong>{termsLastModified}</strong>.
        </p>

        <p>
          Niniejszy dokument opisuje zasady korzystania z bezpłatnego generatora
          rachunków Invoice Creator.
        </p>

        <section className='mt-4'>
          <h2 className='h5'>§ 1. Definicje i Usługodawca</h2>
          <ol>
            <li>
              <strong>Serwis</strong> — internetowy generator rachunków Invoice
              Creator, dostępny pod adresem <ServiceAddress />.
            </li>
            <li>
              <strong>Usługodawca</strong> — {serviceProviderName},{' '}
              {serviceProviderAddress}, osoba fizyczna działająca prywatnie, bez
              zarejestrowanej działalności gospodarczej. Adres poczty
              elektronicznej do kontaktu: <ContactEmail />.
            </li>
            <li>
              <strong>Użytkownik</strong> — osoba fizyczna, osoba prawna albo
              jednostka organizacyjna korzystająca z Serwisu.
            </li>
            <li>
              <strong>Konsument</strong> — Użytkownik będący konsumentem w
              rozumieniu właściwych przepisów prawa.
            </li>
            <li>
              <strong>Konto</strong> — indywidualny dostęp Użytkownika do
              funkcji Serwisu wymagających zalogowania.
            </li>
            <li>
              <strong>Usługi</strong> — funkcje Serwisu, w szczególności
              obliczanie danych rachunku, przygotowanie dokumentu oraz — po
              zalogowaniu — zapisywanie i zarządzanie danymi wprowadzonymi przez
              Użytkownika.
            </li>
            <li>
              <strong>Dane Użytkownika</strong> — informacje wprowadzone do
              Serwisu lub zapisane na Koncie, w tym dane kontrahentów, dane
              rachunków bankowych oraz dane dokumentów.
            </li>
            <li>
              <strong>Regulamin</strong> — niniejszy dokument.
            </li>
            <li>
              <strong>Umowa</strong> — umowa o świadczenie Usług zawierana
              pomiędzy Usługodawcą a Użytkownikiem na zasadach określonych w
              Regulaminie.
            </li>
            <li>
              <strong>Umowa Powierzenia</strong> — odrębne uzgodnienie
              określające zasady przetwarzania danych osobowych w imieniu
              Użytkownika, jeżeli jest wymagane dla danego sposobu korzystania z
              Serwisu.
            </li>
            <li>
              <strong>Polityka prywatności</strong> — odrębny dokument opisujący
              przetwarzanie danych osobowych w związku z korzystaniem z Serwisu.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 2. Zakres Usług i wymagania techniczne</h2>
          <ol>
            <li>
              Serwis umożliwia przygotowanie rachunku związanego z umową
              cywilnoprawną. Serwis nie jest biurem rachunkowym ani doradcą
              podatkowym, a wygenerowany dokument i obliczenia wymagają
              sprawdzenia przez Użytkownika przed użyciem.
            </li>
            <li>
              Część funkcji generatora jest dostępna bez Konta. Konto umożliwia
              korzystanie z funkcji zapisywania i ponownego otwierania danych.
            </li>
            <li>
              Do korzystania z Serwisu potrzebne są: urządzenie z dostępem do
              sieci, aktualna przeglądarka internetowa z włączoną obsługą
              skryptów oraz możliwość pobierania i otwierania dokumentów
              wygenerowanych w Serwisie.
            </li>
            <li>
              Użytkownik odpowiada za prawidłowość, kompletność i aktualność
              danych wprowadzonych do Serwisu oraz za sprawdzenie dokumentu,
              obliczeń i ich zgodności z sytuacją faktyczną oraz obowiązującymi
              przepisami.
            </li>
            <li>
              Użytkownikiem będącym osobą fizyczną może być wyłącznie osoba,
              która ukończyła 18 lat. Osoba działająca w imieniu osoby prawnej
              albo jednostki organizacyjnej musi być pełnoletnia i uprawniona do
              jej reprezentowania.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 3. Konto i zawarcie Umowy</h2>
          <ol>
            <li>
              Umowa o korzystanie z funkcji Serwisu dostępnych bez Konta zostaje
              zawarta z chwilą rozpoczęcia korzystania z tych funkcji.
            </li>
            <li>
              Utworzenie Konta wymaga podania danych wskazanych w formularzu
              rejestracyjnym, zapoznania się z Regulaminem i jego akceptacji
              przez zaznaczenie wymaganego pola. Akceptacja ma być dostępna
              zarówno przy rejestracji hasłem, jak i przy rejestracji linkiem
              wysłanym pocztą elektroniczną. Konto utworzone linkiem wymaga
              potwierdzenia adresu poczty elektronicznej przez otwarcie linku.
              Dostęp do funkcji Konta jest uruchamiany po zakończeniu
              rejestracji. Odrębny, dobrowolny wniosek o rozpoczęcie świadczenia
              Usług przed upływem terminu na odstąpienie nie zastępuje
              akceptacji Regulaminu. Niezaznaczenie tego pola nie blokuje
              utworzenia Konta ani dostępu do Usług.
            </li>
            <li>
              Usługodawca przechowuje informację o wersji zaakceptowanego
              Regulaminu oraz czasie akceptacji przez okres niezbędny do
              wykazania zawarcia Umowy i ustalenia, dochodzenia lub obrony
              roszczeń. Dostęp do tych informacji jest ograniczony do osób,
              które potrzebują go w tym celu.
            </li>
            <li>
              Użytkownik zobowiązuje się podawać prawdziwe dane wymagane do
              utworzenia Konta i chronić dane służące do logowania. W przypadku
              podejrzenia, że dostęp do Konta uzyskała osoba nieuprawniona,
              Użytkownik powinien skontaktować się z Usługodawcą pod adresem{' '}
              <ContactEmail />.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 4. Opłaty</h2>
          <ol>
            <li>
              Korzystanie z opisanych w Regulaminie funkcji Serwisu jest
              bezpłatne.
            </li>
            <li>
              Wprowadzenie opłaty lub płatnego planu będzie wymagało
              przedstawienia Użytkownikowi ceny i warunków przed aktywacją oraz
              uzyskania wymaganej prawem zgody. Samo opublikowanie nowego
              cennika nie powoduje naliczenia opłaty za dotychczasowe bezpłatne
              korzystanie z Serwisu.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 5. Zasady korzystania z Serwisu</h2>
          <ol>
            <li>
              Użytkownik zobowiązuje się korzystać z Serwisu zgodnie z prawem,
              Regulaminem i jego przeznaczeniem oraz nie podejmować działań
              zakłócających działanie lub bezpieczeństwo Serwisu.
            </li>
            <li>
              Użytkownik nie może w szczególności podejmować prób uzyskania
              nieuprawnionego dostępu do Serwisu, obchodzić jego zabezpieczeń,
              wprowadzać złośliwego oprogramowania ani korzystać z Serwisu w
              celu naruszania praw innych osób. Użytkownik nie może wprowadzać
              ani przechowywać w Serwisie treści, których wprowadzanie lub
              przechowywanie jest niezgodne z prawem.
            </li>
            <li>
              Użytkownik może wprowadzać dane osób trzecich tylko wtedy, gdy ma
              do tego właściwą podstawę i uprawnienie. Jeżeli przepisy nakładają
              na Użytkownika obowiązek informacyjny wobec tych osób, Użytkownik
              odpowiada za jego wykonanie.
            </li>
            <li>
              Użytkownik powinien samodzielnie zachować kopie dokumentów,
              których przechowywanie jest mu potrzebne. Serwis nie zastępuje
              archiwum księgowego ani ustawowego systemu przechowywania
              dokumentacji.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 6. Dane Użytkownika i prawa do dokumentów</h2>
          <ol>
            <li>
              Użytkownik zachowuje prawa do Danych Użytkownika w zakresie, w
              jakim mu przysługują. Użytkownik zezwala Usługodawcy na techniczne
              utrwalanie i przechowywanie Danych Użytkownika wyłącznie w
              zakresie koniecznym do świadczenia Usług. Nie uprawnia to
              Usługodawcy do wykorzystywania Danych Użytkownika do własnych
              celów marketingowych ani do udostępniania ich innym Użytkownikom.
            </li>
            <li>
              Użytkownik odpowiada za to, by wprowadzenie Danych Użytkownika
              oraz korzystanie z nich w Serwisie nie naruszało praw osób
              trzecich ani przepisów prawa.
            </li>
            <li>
              Zasady przetwarzania danych osobowych przez Usługodawcę, w tym
              dane o dostawcach infrastruktury, podstawach i okresach
              przechowywania, określa Polityka prywatności. W zakresie, w jakim
              Usługodawca przetwarza dane osobowe w imieniu Użytkownika
              działającego jako administrator, szczegółowe warunki wymagają
              uregulowania w Umowie Powierzenia. Polityka prywatności i Umowa
              Powierzenia muszą być zgodne z działaniem Serwisu przed
              opublikowaniem tego Regulaminu.
            </li>
            <li>
              Użytkownik może korzystać z dokumentów wygenerowanych z
              wprowadzonych przez niego danych. Regulamin nie rozstrzyga o
              prawach do danych ani materiałów osób trzecich. Prawa do elementów
              Serwisu stworzonych przez Usługodawcę przysługują Usługodawcy.
              Elementy osób trzecich są udostępniane na zasadach licencji
              właściwych dla tych elementów, w tym licencji open source.
              Korzystanie z Serwisu nie przenosi praw do jego oprogramowania ani
              nie rozszerza uprawnień wynikających z takich licencji.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 7. Dostępność i zmiany w Serwisie</h2>
          <ol>
            <li>
              Usługodawca dokłada starań, aby Serwis działał prawidłowo, ale nie
              gwarantuje nieprzerwanej dostępności ani określonego czasu reakcji
              na zgłoszenia.
            </li>
            <li>
              Usługodawca może czasowo ograniczyć dostęp do Serwisu w zakresie
              koniecznym do prac technicznych, usunięcia awarii, ochrony
              bezpieczeństwa albo wykonania obowiązku prawnego. O planowanych
              pracach poinformuje z wyprzedzeniem, jeżeli będzie to możliwe.
            </li>
            <li>
              Usługodawca może rozwijać lub zmieniać funkcje Serwisu. Zmiany nie
              ograniczają praw Użytkownika wynikających z bezwzględnie
              obowiązujących przepisów.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 8. Reklamacje i uprawnienia Konsumenta</h2>
          <ol>
            <li>
              Reklamacje dotyczące działania Serwisu można składać na adres
              poczty elektronicznej <ContactEmail />. Zgłoszenie powinno
              opisywać problem i, jeśli to możliwe, wskazywać datę jego
              wystąpienia oraz funkcję Serwisu, której dotyczy.
            </li>
            <li>
              Usługodawca udzieli odpowiedzi na reklamację w terminie 14 dni
              kalendarzowych od jej otrzymania, z zastrzeżeniem terminów lub
              skutków wynikających z bezwzględnie obowiązujących przepisów.
            </li>
            <li>
              Postanowienia Regulaminu nie wyłączają ani nie ograniczają praw
              Konsumenta wynikających z przepisów o umowach zawieranych na
              odległość oraz o zgodności usług cyfrowych z umową. Informacje o
              sposobie i terminie wykonania prawa odstąpienia, w zakresie w
              jakim przysługuje ono w odniesieniu do danej Usługi, oraz adres do
              złożenia oświadczenia: adres poczty elektronicznej wskazany w § 1
              ust. 2.
            </li>
            <li>
              Konsument może zwrócić się o pomoc do właściwego miejskiego lub
              powiatowego rzecznika konsumentów albo skorzystać z pozasądowego
              sposobu rozpatrywania sporów, jeśli jest dostępny dla danej
              sprawy. Informacje o podmiotach prowadzących takie postępowania w
              państwach UE są dostępne w{' '}
              <a
                href='https://consumer-redress.ec.europa.eu/dispute-resolution-bodies'
                target='_blank'
                rel='noreferrer'
              >
                wykazie Komisji Europejskiej
              </a>
              . Właściwy podmiot i dostępność postępowania zależą od rodzaju
              sprawy.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 9. Czas trwania Umowy i usunięcie Konta</h2>
          <ol>
            <li>
              Umowa dotycząca Konta jest zawierana na czas nieokreślony.
              Użytkownik może przestać korzystać z Serwisu w dowolnym czasie.
            </li>
            <li>
              Użytkownik może zażądać usunięcia Konta z poziomu funkcji
              dostępnych w Serwisie. Usunięcie Konta powoduje usunięcie
              zapisanych na nim rachunków, zapisanych danych kontrahentów i
              zapisanych danych rachunku bankowego, z uwzględnieniem danych,
              których dalsze przechowywanie jest wymagane prawem.
            </li>
            <li>
              Usługodawca może zawiesić Konto, gdy jest to konieczne do ochrony
              bezpieczeństwa Serwisu, wykonania obowiązku prawnego albo
              zaprzestania poważnego lub powtarzającego się naruszenia
              Regulaminu. Jeżeli okoliczności na to pozwalają, Usługodawca
              wcześniej poinformuje Użytkownika o przyczynie i sposobie
              przywrócenia dostępu.
            </li>
            <li>
              Usługodawca poinformuje Użytkowników o zakończeniu świadczenia
              Usług co najmniej 30 dni wcześniej. W tym okresie Użytkownik
              będzie mógł pobrać zapisane rachunki, dane stron i dane rachunku
              bankowego za pomocą funkcji eksportu dostępnej w ustawieniach
              Konta.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 10. Odpowiedzialność</h2>
          <ol>
            <li>
              Serwis jest narzędziem pomocniczym. Usługodawca nie świadczy za
              jego pośrednictwem doradztwa prawnego, podatkowego ani księgowego.
              Użytkownik odpowiada za ocenę, czy wygenerowany dokument i
              obliczenia są właściwe dla jego sytuacji.
            </li>
            <li>
              Użytkownik odpowiada za skutki podania nieprawidłowych lub
              niekompletnych danych oraz za sposób wykorzystania dokumentu po
              jego wygenerowaniu.
            </li>
            <li>
              Regulamin nie wyłącza ani nie ogranicza odpowiedzialności
              Usługodawcy w zakresie, w jakim takie wyłączenie lub ograniczenie
              byłoby niedopuszczalne na mocy bezwzględnie obowiązujących
              przepisów, w szczególności wobec Konsumenta. Zakres ewentualnego
              ograniczenia odpowiedzialności w relacji z Użytkownikiem
              niebędącym Konsumentem nie jest określony w Regulaminie.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 11. Zmiana Regulaminu</h2>
          <ol>
            <li>
              Usługodawca może zmienić Regulamin z ważnej przyczyny, w
              szczególności w razie zmiany prawa, zakresu Usług, sposobu
              działania Serwisu lub wymagań bezpieczeństwa.
            </li>
            <li>
              O planowanej zmianie Użytkownik zostanie poinformowany przez
              wiadomość na adres poczty elektronicznej przypisany do Konta lub
              komunikat w Serwisie, z wyprzedzeniem co najmniej 14 dni, chyba że
              wcześniejsze wejście zmiany w życie jest konieczne z przyczyn
              prawnych lub bezpieczeństwa.
            </li>
            <li>
              Użytkownik, który nie akceptuje zmiany, może zakończyć korzystanie
              z Serwisu i usunąć Konto przed datą wejścia zmiany w życie. Zmiana
              nie narusza praw nabytych ani uprawnień Konsumenta wynikających z
              przepisów.
            </li>
          </ol>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>§ 12. Postanowienia końcowe</h2>
          <ol>
            <li>
              Regulamin podlega prawu polskiemu, z zastrzeżeniem przepisów
              bezwzględnie chroniących Konsumenta.
            </li>
            <li>
              Spory będą rozstrzygane przez sąd właściwy zgodnie z
              obowiązującymi przepisami. Regulamin nie zmienia ustawowej
              właściwości sądu w sprawach Konsumentów.
            </li>
            <li>
              W sprawach dotyczących danych osobowych zastosowanie ma również
              Polityka prywatności dostępna pod adresem{' '}
              <Link href='/privacy'>/privacy</Link>, a w zakresie przetwarzania
              danych w imieniu Użytkownika — zawarta Umowa Powierzenia.
            </li>
            <li>
              Regulamin w wersji obowiązującej jest udostępniany w Serwisie w
              sposób umożliwiający jego zapisanie i odtworzenie.
            </li>
          </ol>
        </section>
      </Card>
    </Container>
  );
}
