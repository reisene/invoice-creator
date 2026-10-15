# Invoice Creator

[![Better Stack Badge](https://incidents.betterstack.com/status-badges/v1/monitor/30soy.svg)](https://incidents.betterstack.com/?utm_source=status_badge)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/47f0903270ca44c29b6de5f570582732)](https://app.codacy.com/gh/reisene/invoice-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

Polskojęzyczny generator rachunków do umowy zlecenia. Oblicza składki i zaliczkę na podatek na podstawie danych formularza, pokazuje podgląd dokumentu i pozwala pobrać rachunek jako PDF. Konto jest opcjonalne do przygotowania rachunku; po zalogowaniu można zapisywać i ponownie otwierać dane.

## Funkcje

- Rozliczenia miesięczne i godzinowe.
- Obliczenia ZUS i PIT z uwzględnieniem wybranego statusu zleceniobiorcy, kosztów uzyskania przychodu 20% lub 50%, PIT-2 oraz ulgi dla młodych. Generator korzysta z parametrów podatkowych zapisanych w bazie, a gdy nie są dostępne — z wartości domyślnych w kodzie.
- Podgląd rachunku, przykładowe dokumenty i eksport do PDF.
- Opcjonalne konto z możliwością zapisywania rachunków, kontrahentów i rachunku bankowego, a także importu i eksportu danych.
- Rejestracja i logowanie przez Neon Auth; formularz kontaktowy z ochroną antyspamową.
- Strony pomocy, Regulamin, Polityka prywatności i ustawienia cookies.

Obliczenia mają charakter pomocniczy. Przed wykorzystaniem rachunku sprawdź dane wejściowe, wynik i zastosowanie właściwych przepisów w swojej sytuacji. Użytkownik odpowiada za wybór danych i statusu zleceniobiorcy.

## Technologie

- Next.js 16 (App Router), React 19 i TypeScript.
- PostgreSQL na Neon, Prisma 7 i Neon Auth.
- Upstash Redis do opcjonalnego limitowania żądań oraz Resend do wiadomości e-mail.
- Vercel BotID do ochrony formularza kontaktowego.
- Sentry do raportowania błędów; Session Replay jest uruchamiany dopiero po zgodzie na opcjonalne pomiary.
- Vercel Web Analytics i Speed Insights — wyłącznie po zgodzie na opcjonalne pomiary.

## Wymagania

- Node.js 24 lub nowszy (zgodnie z `engines` w `package.json`).
- npm oraz dostęp do PostgreSQL skonfigurowanego dla aplikacji.
- Dla zalogowanych funkcji: skonfigurowany projekt Neon Auth.
- Doppler CLI dla zalecanego polecenia `npm run dev`.

## Uruchomienie lokalne

1. Sklonuj repozytorium i zainstaluj zależności poleceniem `npm ci`.

2. Skopiuj `.env.example` do `.env` i uzupełnij ustawienia środowiska. Nie commituj sekretów. Do działania bazy potrzebne są połączenia `DATABASE_URL` (Prisma CLI/migracje) oraz `DATABASE_URL_POOLED` (runtime aplikacji). Funkcje konta wymagają konfiguracji Neon Auth. `INVOICE_DATA_ENCRYPTION_KEY` powinien być losowym kluczem 32-bajtowym zapisanym jako 64 znaki szesnastkowe; utrata lub zmiana klucza uniemożliwi odszyfrowanie wcześniej zapisanych wartości.

3. W zalecanym trybie skonfiguruj Doppler dla projektu i środowiska, a następnie uruchom serwer poleceniem `npm run dev`. Skrypt uruchamia Next.js przez `doppler run`. Jeżeli nie korzystasz z Dopplera, możesz użyć lokalnego `.env`, uruchomić `npm run predev`, a następnie `npx next dev`.

4. Otwórz [http://localhost:3000](http://localhost:3000).

Przed włączeniem zapisu danych skonfiguruj bazę i zastosuj migracje:

```bash
npx prisma migrate dev
npm run db:seed
```

Seed wstawia przykładowe parametry podatkowe. Nie uruchamiaj go na produkcyjnej bazie bez sprawdzenia jego zawartości i skutków.

## Zmienne środowiskowe

`.env.example` zawiera szablon nazw i formatów. Najważniejsze ustawienia:

- `DATABASE_URL` — bezpośrednie połączenie PostgreSQL dla Prisma CLI i migracji.
- `DATABASE_URL_POOLED` — pooled connection aplikacji do Neon.
- `NEON_AUTH_BASE_URL` i `NEON_AUTH_COOKIE_SECRET` — konfiguracja Neon Auth.
- `INVOICE_DATA_ENCRYPTION_KEY` — klucz szyfrujący zapisane dane rachunków i stron oraz pseudonimizujący identyfikatory rate limitingu.
- `SITE_URL` i `NEXT_PUBLIC_SITE_URL` — kanoniczny adres serwisu i linki w wiadomościach.
- `SERVICE_PROVIDER_NAME` i `SERVICE_PROVIDER_ADDRESS` — dane usługodawcy renderowane w dokumentach prawnych.
- `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN` — opcjonalne limitowanie żądań; bez konfiguracji limity nie są egzekwowane.
- `RESEND_API_KEY` — wysyłanie e-maili i sonda Resend w health checku.
- `SENTRY_DSN` i `NEXT_PUBLIC_SENTRY_DSN` — raportowanie błędów na serwerze/Edge i w przeglądarce.
- `CRON_SECRET` — autoryzacja zaplanowanego zadania retencji.
- `HEALTH_CHECK_SECRET` — oddzielny sekret autoryzujący endpoint diagnostyczny.
- `RETENTION_HEARTBEAT_URL` — opcjonalny adres monitoringu wywoływany po udanym zadaniu retencji.

Wartości związane z pocztą kontaktową i weryfikacją e-mail znajdują się również w `.env.example`. Upstash, Resend, Sentry, heartbeat i health check można konfigurować zależnie od używanych funkcji; wymagania konkretnego wdrożenia należy sprawdzić przed publikacją. Nie zapisuj sekretów w kodzie, README ani po stronie klienta.

## Przydatne polecenia

- `npm run dev` — generuje rejestr dokumentów i uruchamia Next.js przez Doppler.
- `npm run build` — generuje klienta Prisma i buduje aplikację Next.js; hook `prebuild` generuje rejestr dokumentów prawnych.
- `npm start` — uruchamia zbudowaną aplikację.
- `npm run lint` — uruchamia ESLint.
- `npm run typecheck` — generuje rejestr dokumentów i sprawdza typy TypeScript.
- `npm test` — uruchamia testy Node.js przez `tsx`.
- `npm run db:seed` — wypełnia bazę przykładowymi parametrami podatkowymi.
- `npm run format:check` — sprawdza formatowanie Prettierem.

## Prywatność i bezpieczeństwo

- Zapisane dane rachunków, stron i rachunków bankowych są szyfrowane w aplikacji przy użyciu AES-256-GCM. Klucz szyfrujący nie jest przechowywany w bazie.
- Identyfikatory używane przez Upstash do limitowania są pseudonimizowane przez HMAC-SHA-256; surowy identyfikator nie jest używany jako klucz limitu.
- Vercel Web Analytics i Speed Insights oraz Sentry Session Replay są uruchamiane po akceptacji opcjonalnych pomiarów. Session Replay ma domyślne maskowanie tekstu i wartości pól oraz blokowanie mediów. Zgłoszenia błędów Sentry są odrębnym mechanizmem diagnostycznym.
- Wydruk rachunku i jego obliczenia wykonywane są w przeglądarce; zapis na koncie i usługi serwerowe wymagają przesłania danych do aplikacji.
- Więcej informacji o danych, retencji i prawach użytkownika znajduje się w [Polityce prywatności](/privacy). Zasady korzystania z usługi określa [Regulamin](/terms).

### Endpoint diagnostyczny

`GET /api/health` wymaga nagłówka `Authorization: Bearer <HEALTH_CHECK_SECRET>`. Sprawdza w trybie tylko do odczytu dostępność PostgreSQL, Upstash, Neon Auth i Resend, o ile te usługi są skonfigurowane. Zwraca `200` przy powodzeniu wszystkich sond lub `503`, gdy co najmniej jedna sonda jest niedostępna, nie skonfigurowana albo ograniczona uprawnieniami. Odpowiedź nie jest buforowana. To nie jest test pełnego przepływu logowania ani wysyłki wiadomości.

### Zadanie retencji

Vercel Cron uruchamia `GET /api/cron/contact-retention` codziennie o 03:00 UTC (`0 3 * * *`). Endpoint wymaga `Authorization: Bearer <CRON_SECRET>`. Po zakończeniu wszystkich operacji retencji może wysłać heartbeat do `RETENTION_HEARTBEAT_URL`; heartbeat nie zastępuje health checka. Nie umieszczaj jego prywatnego URL w kodzie ani publicznym logu.

### Ochrona formularza kontaktowego

Formularz kontaktowy korzysta z Vercel BotID Basic, honeypota i opcjonalnego limitu Upstash. Weryfikacja BotID poprzedza zapis zgłoszenia i wysyłkę wiadomości. BotID nie chroni endpointu health check ani zadania cron. Lokalna klasyfikacja BotID może różnić się od działania w środowisku Vercel.

## Wdrożenie

Projekt jest skonfigurowany pod Next.js i Vercel (region `fra1`). Przed wdrożeniem:

1. Ustaw w środowisku docelowym wymagane połączenia i sekrety z `.env.example`.
2. Wykonaj migracje produkcyjne poleceniem `npx prisma migrate deploy` przed uruchomieniem nowej wersji aplikacji.
3. Włącz wymagane produkty w panelach Neon, Resend, Upstash, Sentry i Vercel stosownie do używanych funkcji.
4. Skonfiguruj `CRON_SECRET`; jeśli używasz monitoringu cyklu retencji, ustaw także `RETENTION_HEARTBEAT_URL` i monitoruj harmonogram cron.
5. Sprawdź Regulamin i Politykę prywatności pod kątem rzeczywistej konfiguracji usług i operatora przed udostępnieniem aplikacji użytkownikom.

Nie uruchamiaj `prisma migrate reset` na bazie zawierającej dane, których nie chcesz usunąć.

## Rozwój i wkład

Przed większą zmianą otwórz issue. Zasady współpracy znajdują się w:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

Przed zgłoszeniem zmian uruchom odpowiednie kontrole, na przykład:

```bash
npm run lint
npm run typecheck
npm test
```

Aktualny zestaw testów zawiera testy jednostkowe kalkulacji rachunku; projekt nie deklaruje w tym README pokrycia testami E2E ani integracyjnymi.

## Licencja

Projekt jest udostępniany na licencji GNU General Public License v3.0 lub nowszej. Szczegóły zawiera [LICENSE](./LICENSE).
