import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Card, Container } from 'react-bootstrap';

export const metadata: Metadata = {
  title: 'Polityka prywatności',
};

function ControllerDetails() {
  const name = process.env.SERVICE_PROVIDER_NAME?.trim() ?? '';
  const address = process.env.SERVICE_PROVIDER_ADDRESS?.trim() ?? '';
  const email = process.env.CONTACT_REPLY_TO?.trim() ?? '';

  return (
    <p>
      Administratorem danych jest {name}, {address}. Kontakt w sprawach
      dotyczących prywatności:{' '}
      {email ? <a href={`mailto:${email}`}>{email}</a> : null}. Inspektor
      ochrony danych nie został wyznaczony.
    </p>
  );
}

export default async function PrivacyPage() {
  await connection();

  const resendEnabled = Boolean(process.env.RESEND_API_KEY);
  const upstashEnabled = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );

  return (
    <Container className='py-5 page-wide'>
      <Card
        body
        className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-4 p-md-5'
      >
        <h1 className='h3 mb-2 text-body-emphasis'>Polityka prywatności</h1>

        <section className='mt-4'>
          <h2 className='h5'>1. Administrator i kontakt</h2>
          <ControllerDetails />
        </section>

        <section className='mt-4'>
          <h2 className='h5'>2. Jakie dane przetwarzamy</h2>
          <ul>
            <li>
              <strong>Konto i logowanie:</strong> adres e-mail, imię i nazwisko,
              identyfikator konta oraz informacje niezbędne do uwierzytelnienia
              i obsługi sesji. Uwierzytelnianie jest obsługiwane przez Neon
              Auth; hasło nie jest przechowywane w rekordach aplikacji.
            </li>
            <li>
              <strong>Dane wprowadzane do generatora:</strong> informacje
              zawarte w rachunkach i dokumentach, w tym dane Użytkownika,
              kontrahentów, umów, rozliczeń i rachunków bankowych. Aplikacja
              pozwala zapisać część tych danych na Koncie.
            </li>
            <li>
              <strong>Kontakt i reklamacje:</strong> imię lub nazwa, adres
              e-mail, temat, kategoria i treść wiadomości; w przypadku
              zalogowanego Użytkownika także identyfikator Konta.
            </li>
            <li>
              <strong>Akceptacja Regulaminu:</strong> adres e-mail, wersja
              dokumentu, sposób rejestracji, czas akceptacji oraz — jeśli
              Użytkownik zaznaczy odpowiednie pole — informacja o wniosku o
              rozpoczęcie świadczenia Usług przed upływem terminu na
              odstąpienie. Wpis rozpoczęty przy rejestracji linkiem może
              oczekiwać na powiązanie z Kontem.
            </li>
            <li>
              <strong>Dane techniczne i bezpieczeństwa:</strong> informacje
              dotyczące obsługi żądań i bezpieczeństwa. Upstash wykorzystuje
              identyfikator Konta albo adres IP do limitowania żądań. Vercel
              rejestruje informacje o wykonaniu żądań i logi błędów aplikacji.
              Resend przetwarza dane wiadomości i zdarzenia jej wysyłki,
              dostarczenia lub odrzucenia.
            </li>
          </ul>
          <p>
            Dane wpisane w generatorze bez zapisywania na Koncie mogą być
            przechowywane w pamięci bieżącej sesji przeglądarki dla funkcji
            podglądu. Nie należy wpisywać danych, których Użytkownik nie ma
            prawa przetwarzać.
          </p>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>3. Cele i podstawy przetwarzania</h2>
          <p>
            Dane są używane w celu utworzenia i obsługi Konta, świadczenia
            funkcji generatora i zapisu danych na żądanie Użytkownika, kontaktu
            w sprawie zgłoszeń, zapewnienia bezpieczeństwa, zapobiegania
            nadużyciom oraz wykazania faktu i treści akceptacji Regulaminu.
          </p>
          <p>
            Podstawy prawne właściwe dla poszczególnych celów, w tym wykonanie
            umowy, działania przed jej zawarciem, prawnie uzasadniony interes
            administratora lub obowiązek prawny, stosuje się odpowiednio do celu
            przetwarzania. Dane nie są wykorzystywane do profilowania ani do
            zautomatyzowanego podejmowania decyzji wywołujących skutki prawne
            lub podobnie istotnie wpływających na Użytkownika.
          </p>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>4. Dostawcy i odbiorcy danych</h2>
          <p>
            Dane mogą być przetwarzane przez dostawców usług technicznych
            działających na potrzeby aplikacji. Zgodnie z obecnymi ustawieniami
            i informacjami o koncie:
          </p>
          <ul>
            <li>
              Neon — baza danych i uwierzytelnianie (Neon Auth); skonfigurowany
              region Frankfurt / EU Central;
            </li>
            <li>
              Vercel — hosting i uruchamianie aplikacji; funkcje aplikacji są
              przypisane do regionu Frankfurt (fra1);
            </li>
            {resendEnabled && (
              <li>
                Resend — wysyłka wiadomości z formularza kontaktowego, w tym
                treści wiadomości, adresu e-mail, imienia lub nazwy i tematu;
                region przetwarzania EU;
              </li>
            )}
            {upstashEnabled && (
              <li>
                Upstash — limitowanie żądań w Redis; region instancji EU, a
                identyfikatorem limitowania jest identyfikator Konta albo adres
                IP.
              </li>
            )}
          </ul>
          <p>
            Odbiorcami mogą być także dostawcy poczty Użytkownika oraz organy
            publiczne, jeśli ujawnienie danych jest wymagane przez prawo. W
            zakresie, w jakim dostawcy przetwarzają dane w imieniu
            Administratora na potrzeby Serwisu, pełnią rolę podmiotów
            przetwarzających. Mogą również przetwarzać niektóre dane jako
            odrębni administratorzy, zgodnie z własnymi warunkami. Dla kont
            Neon, Vercel, Resend i Upstash zaakceptowano warunki przetwarzania
            danych (DPA). Dostawcy mogą korzystać z dalszych podwykonawców
            zgodnie z własnymi warunkami.
          </p>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>5. Okres przechowywania</h2>
          <ul>
            <li>
              Dane zapisane na Koncie są przechowywane do czasu usunięcia Konta
              przez Użytkownika, z zastrzeżeniem informacji, które trzeba
              zachować w innym celu prawnym.
            </li>
            <li>
              Wiadomości z formularza kontaktowego są usuwane automatycznie po
              upływie 12 miesięcy od ich utworzenia. Kopie wiadomości wysłane
              pocztą elektroniczną mogą być przechowywane oddzielnie w
              skrzynkach pocztowych.
            </li>
            <li>
              Dowody akceptacji Regulaminu są przechowywane przez okres
              niezbędny do wykazania zawarcia Umowy oraz ustalenia, dochodzenia
              lub obrony roszczeń.
            </li>
            <li>
              Niepowiązane z Kontem wpisy akceptacji Regulaminu z rejestracji
              linkiem są usuwane po 30 dniach. Dane mogą pozostawać w kopiach
              zapasowych przez okres wynikający z cyklu ich tworzenia i
              przechowywania.
            </li>
            <li>
              Logi wykonania aplikacji w Vercel są dostępne przez godzinę.
              Wiadomości i powiązane z nimi logi w Resend są przechowywane przez
              30 dni. Logi Neon nie są obecnie włączone; w Upstash nie są
              przeglądane odrębne logi ani metryki.
            </li>
          </ul>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>6. Usunięcie Konta i eksport</h2>
          <p>
            Użytkownik może zażądać usunięcia Konta i pobrać eksport zapisanych
            danych dostępny w Serwisie. Usunięcie Konta usuwa z aplikacji
            zapisane rachunki, dane kontrahentów, dane rachunku bankowego i
            powiązane sekwencje numeracji. Dowody akceptacji Regulaminu oraz
            wiadomości kontaktowe nie są usuwane w ramach tej operacji, jeśli
            ich dalsze przechowywanie jest uzasadnione wskazanymi wyżej celami.
            Dane w kopiach zapasowych są usuwane zgodnie z cyklem ich
            przechowywania przez dostawców.
          </p>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>7. Prawa osób, których dane dotyczą</h2>
          <p>
            Osoba, której dane dotyczą, może — w zakresie i na warunkach
            wynikających z przepisów — żądać dostępu do danych, ich
            sprostowania, usunięcia, ograniczenia przetwarzania lub
            przeniesienia, a także wnieść sprzeciw wobec przetwarzania opartego
            na prawnie uzasadnionym interesie. Jeżeli przetwarzanie opiera się
            na zgodzie, zgodę można wycofać bez wpływu na zgodność z prawem
            wcześniejszego przetwarzania. Przysługuje również skarga do Prezesa
            Urzędu Ochrony Danych Osobowych.
          </p>
          <p>
            Wniosek można złożyć na adres kontaktowy wskazany w pkt 1. Dane
            kontrahentów wprowadzane przez Użytkownika do Serwisu mogą być
            przetwarzane w imieniu Użytkownika; w takim zakresie Użytkownik
            powinien otrzymać odrębną informację o zasadach przetwarzania i
            odpowiednim uregulowaniu powierzenia danych.
          </p>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>8. Pliki cookies i pamięć przeglądarki</h2>
          <p>
            Serwis korzysta z technicznych mechanizmów niezbędnych do
            uwierzytelniania i utrzymania sesji. Funkcja podglądu może zapisać
            dane robocze w pamięci sesyjnej przeglądarki. Serwis nie korzysta z
            narzędzi analitycznych ani reklamowych.
          </p>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>9. Dane osób niepełnoletnich</h2>
          <p>
            Serwis jest przeznaczony dla osób, które ukończyły 18 lat. Nie jest
            kierowany do osób niepełnoletnich. W razie informacji, że osoba
            niepełnoletnia przekazała dane w związku z korzystaniem z Serwisu,
            należy skontaktować się z Administratorem pod adresem wskazanym w
            pkt 1.
          </p>
        </section>

        <section className='mt-4'>
          <h2 className='h5'>10. Zmiany Polityki</h2>
          <p>
            Zmiany Polityki będą publikowane w Serwisie. W przypadku zmian
            istotnie wpływających na Użytkowników sposób i termin ich
            zakomunikowania zostaną określone z uwzględnieniem właściwych
            przepisów.
          </p>
        </section>
      </Card>
    </Container>
  );
}
