# Invoice Creator

[![Better Stack Badge](https://incidents.betterstack.com/status-badges/v1/monitor/30soy.svg)](https://incidents.betterstack.com/?utm_source=status_badge)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/47f0903270ca44c29b6de5f570582732)](https://app.codacy.com/gh/reisene/invoice-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![codecov](https://codecov.io/gh/reisene/invoice-creator/graph/badge.svg?token=33QPZ73K28)](https://codecov.io/gh/reisene/invoice-creator)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Freisene%2Finvoice-creator)
[![Visual Studio Code](https://img.shields.io/badge/Editor-Visual%20Studio%20Code-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![WebStorm](https://img.shields.io/badge/Editor-WebStorm-000000?logo=webstorm&logoColor=white)](https://www.jetbrains.com/webstorm/)

Polskojęzyczny generator rachunków do umowy zlecenia. Oblicza składki i zaliczkę na podatek na podstawie danych formularza, pokazuje podgląd dokumentu i pozwala pobrać rachunek jako PDF. Konto jest opcjonalne do przygotowania rachunku; po zalogowaniu można zapisywać i ponownie otwierać dane.

## Spis treści

- [Invoice Creator](#invoice-creator)
  - [Spis treści](#spis-treści)
  - [Funkcje](#funkcje)
  - [Technologie](#technologie)
  - [Uruchomienie lokalne](#uruchomienie-lokalne)
    - [Wymagania](#wymagania)
    - [Instalacja i konfiguracja](#instalacja-i-konfiguracja)
    - [Migracje i dane początkowe](#migracje-i-dane-początkowe)
  - [Zmienne środowiskowe](#zmienne-środowiskowe)
    - [Wymagane w runtime](#wymagane-w-runtime)
    - [Opcjonalne](#opcjonalne)
    - [Zarezerwowane i zapasowe](#zarezerwowane-i-zapasowe)
  - [Przydatne polecenia](#przydatne-polecenia)
  - [Testy i pokrycie](#testy-i-pokrycie)
    - [Zakres testów](#zakres-testów)
    - [Uruchamianie](#uruchamianie)
    - [Progi i ograniczenia](#progi-i-ograniczenia)
  - [CI i kontrola jakości](#ci-i-kontrola-jakości)
  - [Prywatność i bezpieczeństwo](#prywatność-i-bezpieczeństwo)
    - [Ochrona formularza kontaktowego](#ochrona-formularza-kontaktowego)
  - [Diagnostyka i zadania cykliczne](#diagnostyka-i-zadania-cykliczne)
    - [Endpoint diagnostyczny](#endpoint-diagnostyczny)
    - [Zadanie retencji](#zadanie-retencji)
  - [Wdrożenie](#wdrożenie)
  - [Backup bazy danych](#backup-bazy-danych)
    - [Konfiguracja](#konfiguracja)
    - [Klucze szyfrujące](#klucze-szyfrujące)
    - [Przebieg i retencja kopii](#przebieg-i-retencja-kopii)
    - [Odtwarzanie](#odtwarzanie)
  - [Rozwój i wkład](#rozwój-i-wkład)
  - [Licencja](#licencja)

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

## Uruchomienie lokalne

### Wymagania

- Node.js 24.x (zgodnie z `.nvmrc` i `engines` w `package.json`). W ustawieniach projektu Vercel wybierz tę samą linię Node.js.
- npm oraz dostęp do PostgreSQL skonfigurowanego dla aplikacji.
- Dla zalogowanych funkcji: skonfigurowany projekt Neon Auth.
- Doppler CLI dla zalecanego polecenia `npm run dev`.

### Instalacja i konfiguracja

1. Sklonuj repozytorium i zainstaluj zależności poleceniem `npm ci`.

2. Skopiuj `.env.example` do `.env` i uzupełnij ustawienia środowiska. Nie commituj sekretów. Do działania bazy potrzebne są połączenia `DATABASE_URL` (Prisma CLI/migracje) oraz `DATABASE_URL_POOLED` (runtime aplikacji). Funkcje konta wymagają konfiguracji Neon Auth. `INVOICE_DATA_ENCRYPTION_KEY` powinien być losowym kluczem 32-bajtowym zapisanym jako 64 znaki szesnastkowe; utrata lub zmiana klucza uniemożliwi odszyfrowanie wcześniej zapisanych wartości.

3. Przygotuj bazę zgodnie z sekcją [Migracje i dane początkowe](#migracje-i-dane-początkowe).

4. Uruchom serwer jednym z poniższych sposobów i otwórz [http://localhost:3000](http://localhost:3000).

**Z Dopplerem (zalecane):** skonfiguruj projekt i środowisko `dev`, następnie:

```bash
npm run dev
```

**Bez Dopplera:** uzupełnij lokalny `.env`, następnie:

```bash
npm run predev
npx next dev
```

### Migracje i dane początkowe

Na lokalnej bazie zastosuj migracje i wczytaj parametry podatkowe:

```bash
npx prisma migrate dev
npm run db:seed
```

Seed wstawia przykładowe parametry podatkowe. Nie uruchamiaj go na produkcyjnej bazie bez sprawdzenia jego zawartości i skutków.

## Zmienne środowiskowe

[`.env.example`](./.env.example) zawiera szablon nazw i formatów. Źródłem sekretów jest Doppler:

| Konfiguracja | Zastosowanie i synchronizacja                  |
| ------------ | ---------------------------------------------- |
| `dev`        | Lokalne `npm run dev` i sekrety GitHub Actions |
| `stg`        | Vercel Preview                                 |
| `prd`        | Vercel Production                              |

Zmiany wprowadzaj w Dopplerze, nie bezpośrednio w panelu Vercel ani GitHub,
bo synchronizacja je nadpisze. Lokalny plik `.env.dev` odzwierciedla wartości
używane przez GitHub Actions. Żadnego pliku `.env*` poza `.env.example` nie commituj.

### Wymagane w runtime

Serwer Node.js sprawdza te zmienne przy starcie (`instrumentation.ts` → `lib/serverEnvironment.ts`). Jeśli którejś brakuje lub ma zły format, aplikacja nie wystartuje, a błąd poda nazwy zmiennych bez ich wartości.

| Zmienna                       | Wymaganie              | Zastosowanie                                                                               |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL_POOLED`         | URL `postgres(ql)://`  | Pooled connection aplikacji do Neon                                                        |
| `NEON_AUTH_BASE_URL`          | URL `http(s)://`       | Neon Auth                                                                                  |
| `NEON_AUTH_COOKIE_SECRET`     | min. 32 bajty          | Podpis ciasteczek sesji Neon Auth                                                          |
| `INVOICE_DATA_ENCRYPTION_KEY` | dokładnie 64 znaki hex | Szyfrowanie zapisanych danych i pseudonimizacja identyfikatorów limitów (32-bajtowy klucz) |
| `CRON_SECRET`                 | min. 16 bajtów         | Autoryzacja zadania retencji                                                               |
| `HEALTH_CHECK_SECRET`         | min. 32 bajty          | Autoryzacja endpointu diagnostycznego                                                      |

Dodatkowo `DATABASE_URL` (bezpośrednie połączenie, bez poolingu) jest wymagane przez Prisma CLI: migracje, `prisma generate` w `npm run typecheck` oraz backup bazy.

### Opcjonalne

- `SITE_URL` i `NEXT_PUBLIC_SITE_URL` — kanoniczny adres serwisu i linki w wiadomościach; `NEXT_PUBLIC_SITE_URL` ma pierwszeństwo, domyślnie `http://localhost:3000`.
- `SERVICE_PROVIDER_NAME` i `SERVICE_PROVIDER_ADDRESS` — dane usługodawcy renderowane w dokumentach prawnych.
- `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN` — limitowanie żądań; bez konfiguracji limity nie są egzekwowane.
- `RESEND_API_KEY` — wysyłanie e-maili i sonda Resend w health checku; bez klucza wysyłka jest pomijana.
- `CONTACT_FROM_EMAIL`, `CONTACT_NOTIFY_EMAIL`, `CONTACT_REPLY_TO` — adresy poczty kontaktowej; mają wartości domyślne.
- `SENTRY_DSN` i `NEXT_PUBLIC_SENTRY_DSN` — raportowanie błędów na serwerze/Edge i w przeglądarce. `SENTRY_AUTH_TOKEN` jest potrzebny tylko w buildzie do wysyłki source map.
- Konfiguracja Sentry w przeglądarce, na serwerze i w Edge wyłącza automatyczne zbieranie danych użytkownika, cookies, nagłówków i treści HTTP, parametrów zapytania URL, danych operacji bazodanowych oraz wartości zmiennych lokalnych. Raportowanie błędów i tracing pozostają aktywne. Te ograniczenia nie anonimizują treści wyjątków ani danych przekazanych ręcznie; nie zastępują weryfikacji zdarzeń i reguł Data Scrubbing w Sentry. Session Replay nadal wymaga zgody i korzysta z odrębnego maskowania.
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` — wspólny dla serwera, Edge i przeglądarki odsetek śladów Sentry, od `0` do `1`; domyślnie `0.1`. Zalecane: `1` w Doppler `dev` i `stg`, `0.1` w `prd`. To ustawienie nie jest sekretem. Jako zmienna `NEXT_PUBLIC_` jest osadzana w kodzie przeglądarki podczas builda, więc zmianę trzeba wdrożyć nowym buildem.
- `RETENTION_HEARTBEAT_URL` — adres monitoringu wywoływany po udanym zadaniu retencji.

### Zarezerwowane i zapasowe

- `AWS_*` i `S3_BUCKET` w konfiguracji aplikacji — zarezerwowane pod przyszłe przechowywanie plików; obecnie nieużywane przez aplikację. Workflow backupu ustawia własne `AWS_*` z sekretów `R2_*`.
- `RESEND_SMTP_API_KEY` — zapasowy klucz Resend (SMTP); aplikacja go nie odczytuje.
- `RESEND_VERIFICATION_EMAIL` — flaga weryfikacji e-mail; aplikacja jej nie odczytuje.

Zmienne GitHub Actions dla backupu opisuje sekcja [Backup bazy danych](#backup-bazy-danych). Nie zapisuj sekretów w kodzie, README ani po stronie klienta.

## Przydatne polecenia

- `npm run dev` — generuje rejestr dokumentów i uruchamia Next.js przez Doppler.
- `npm run build` — generuje klienta Prisma i buduje aplikację Next.js; hook `prebuild` generuje rejestr dokumentów prawnych.
- `npm start` — uruchamia zbudowaną aplikację.
- `npm run lint` — uruchamia ESLint.
- `npm run typecheck` — generuje rejestr dokumentów, klienta Prisma i typy tras Next.js, a następnie sprawdza typy TypeScript. Wymaga ustawionej zmiennej `DATABASE_URL` do wczytania konfiguracji Prisma; nie wykonuje migracji ani zapytań do bazy.
- `npm test` — jednokrotnie uruchamia testy Vitest w środowisku jsdom lub Node.js, zgodnie z ustawieniami plików testowych.
- `npm run test:watch` — uruchamia Vitest w trybie obserwowania zmian.
- `npm run test:coverage` — uruchamia testy i generuje raporty pokrycia w katalogu `coverage/`.
- `npm run db:seed` — wypełnia bazę przykładowymi parametrami podatkowymi.
- `npm run format:check` — sprawdza formatowanie Prettierem.

## Testy i pokrycie

Wszystkie testy korzystają z jednej konfiguracji — [`vitest.config.mts`](./vitest.config.mts).
Baza, uwierzytelnianie i usługi zewnętrzne są mockowane; testy nie wymagają
połączenia z produkcyjnymi usługami.

### Zakres testów

| Katalog                                    | Sprawdzane zachowania                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tests/app/`](./tests/app/)               | Akcje serwerowe, endpointy API, metadane, strony, przekierowania i interakcje formularzy                                                       |
| [`tests/lib/`](./tests/lib/)               | Walidacja, wyliczenia i limity podatkowe, szyfrowanie, migracja danych, numeracja rachunków, zgody, retencja, limity żądań i treści pomocy     |
| [`tests/components/`](./tests/components/) | Formularz i stan generatora, zapis stron i rachunku bankowego, podgląd i pobieranie PDF, symulator, nawigacja, logowanie, cookies i telemetria |

Testy sprawdzają również stany oczekiwania, błędy, ponowienia i blokowanie
operacji przy nieprawidłowych danych. Testy formularza wykonują rzeczywiste
aktualizacje stanu React, wyliczenia korzystają z właściwego kalkulatora,
a testy szyfrowania — z prawdziwego AES-GCM i HMAC na kluczu testowym.

### Uruchamianie

Cały zestaw:

```bash
npm test
npm run test:coverage
```

Wybrany katalog:

```bash
npm test -- tests/app
npm test -- tests/lib
npm test -- tests/components
```

Pokrycie ograniczone do całego wybranego katalogu źródłowego:

```bash
npm run test:coverage -- tests/app --coverage.include="app/**/*.ts" --coverage.include="app/**/*.tsx"
npm run test:coverage -- tests/lib --coverage.include="lib/**/*.ts" --coverage.include="lib/**/*.tsx"
npm run test:coverage -- tests/components --coverage.include="components/**/*.ts" --coverage.include="components/**/*.tsx"
```

### Progi i ograniczenia

- **95%** instrukcji, linii i funkcji oraz **90%** gałęzi.
- Pomiar obejmuje również niewczytane pliki wybranego zakresu.
- Standardowe `npm run test:coverage` egzekwuje progi dla całego zakresu
  źródeł wskazanego w konfiguracji: `app/`, `components/`, `lib/`, `utils/` i `types/`.
- Testy DOM korzystają ze wspólnego [`tests/app/dom.ts`](./tests/app/dom.ts),
  który inicjalizuje jsdom po uruchomieniu workera, aby uniknąć limitu czasu jego startu.
  Testy biblioteczne działają w środowisku Node.js.
- Asynchroniczne komponenty serwerowe są sprawdzane jako funkcje zwracające
  elementy; nie zastępuje to testów E2E React Server Components w działającym Next.js.
- Testy PDF sprawdzają treść i strukturę dokumentu, fonty, rezerwację numeru
  oraz pobieranie. Renderer jest mockowany — układ binarnego pliku i wygląd
  wydruku nie są weryfikowane.

## CI i kontrola jakości

| Mechanizm                                                             | Zakres                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`Code quality`](./.github/workflows/code-quality.yml)                | ESLint i Prettier dla pull requestów oraz zmian w `main` i `develop`                             |
| [`Tests and coverage`](./.github/workflows/tests.yml)                 | Pełny zestaw testów; wysyła raport LCOV do Codecov i Codacy, jeśli skonfigurowano sekrety        |
| Vercel                                                                | Build przy każdym wdrożeniu, także Preview                                                       |
| [`CodeQL`](./.github/workflows/codeql.yml)                            | Analiza kodu                                                                                     |
| [Gałąź Neon dla pull requestu](./.github/workflows/neon-workflow.yml) | Baza wygasająca po 14 dniach; wymaga sekretu `NEON_API_KEY` i zmiennej `NEON_PROJECT_ID`         |
| [`Labeler`](./.github/workflows/labeler.yml)                          | Automatyczne etykiety pull requestów                                                             |
| [Backup bazy](./.github/workflows/database-backup.yml)                | Codzienna zaszyfrowana kopia do R2; szczegóły w sekcji [Backup bazy danych](#backup-bazy-danych) |
| Dependabot                                                            | Cotygodniowe aktualizacje zależności                                                             |

Aby błędy lintowania lub formatowania blokowały scalanie, dodaj kontrolę
`Lint and formatting` do wymaganych kontroli w regułach ochrony gałęzi GitHub.
Testy wymagają kontroli `Tests and coverage`. W ustawieniach repozytorium GitHub
dodaj sekrety `CODECOV_TOKEN` i `CODACY_PROJECT_TOKEN`; workflow pomija wysyłkę,
jeśli sekretu brakuje, i zgłasza ostrzeżenie. Upload jest pomijany w pull
requestach z forków, ponieważ GitHub nie udostępnia im sekretów repozytorium.
Instalacja na Vercelu i w workflow korzysta z `npm ci`, bez aktualizowania lockfile.

## Prywatność i bezpieczeństwo

- Zapisane dane rachunków, stron i rachunków bankowych są szyfrowane w aplikacji przy użyciu AES-256-GCM. Klucz szyfrujący nie jest przechowywany w bazie.
- Identyfikatory używane przez Upstash do limitowania są pseudonimizowane przez HMAC-SHA-256; surowy identyfikator nie jest używany jako klucz limitu.
- Vercel Web Analytics i Speed Insights oraz Sentry Session Replay są uruchamiane po akceptacji opcjonalnych pomiarów. Session Replay ma domyślne maskowanie tekstu i wartości pól oraz blokowanie mediów. Zgłoszenia błędów Sentry są odrębnym mechanizmem diagnostycznym.
- Wydruk rachunku i jego obliczenia wykonywane są w przeglądarce; zapis na koncie i usługi serwerowe wymagają przesłania danych do aplikacji.
- Więcej informacji o danych, retencji i prawach użytkownika znajduje się w [Polityce prywatności](https://invoice-creator.draugskoll.dev/privacy). Zasady korzystania z usługi określa [Regulamin](https://invoice-creator.draugskoll.dev/terms).

### Ochrona formularza kontaktowego

Formularz kontaktowy korzysta z Vercel BotID Basic, honeypota i opcjonalnego limitu Upstash. Weryfikacja BotID poprzedza zapis zgłoszenia i wysyłkę wiadomości. BotID nie chroni endpointu health check ani zadania cron. Lokalna klasyfikacja BotID może różnić się od działania w środowisku Vercel.

## Diagnostyka i zadania cykliczne

### Endpoint diagnostyczny

`GET /api/health` wymaga nagłówka `Authorization: Bearer <HEALTH_CHECK_SECRET>`. Sprawdza w trybie tylko do odczytu dostępność PostgreSQL, Upstash, Neon Auth i Resend, o ile te usługi są skonfigurowane. Zwraca `200` przy powodzeniu wszystkich sond lub `503`, gdy co najmniej jedna sonda jest niedostępna, nie skonfigurowana albo ograniczona uprawnieniami. Odpowiedź nie jest buforowana. To nie jest test pełnego przepływu logowania ani wysyłki wiadomości.

### Zadanie retencji

Vercel Cron uruchamia `GET /api/cron/contact-retention` codziennie o 03:00 UTC (`0 3 * * *`). Endpoint wymaga `Authorization: Bearer <CRON_SECRET>`. Po zakończeniu wszystkich operacji retencji może wysłać heartbeat do `RETENTION_HEARTBEAT_URL`; heartbeat nie zastępuje health checka. Nie umieszczaj jego prywatnego URL w kodzie ani publicznym logu.

## Wdrożenie

Projekt jest skonfigurowany pod Next.js i Vercel (region `fra1`). Przed wdrożeniem:

1. Ustaw wymagane połączenia i sekrety z `.env.example` w konfiguracji Dopplera `stg` (Preview) lub `prd` (Production); synchronizacja przeniesie je do Vercel.
2. Wykonaj migracje produkcyjne poleceniem `npx prisma migrate deploy` przed uruchomieniem nowej wersji aplikacji.
3. Włącz wymagane produkty w panelach Neon, Resend, Upstash, Sentry i Vercel stosownie do używanych funkcji.
4. Skonfiguruj `CRON_SECRET`; jeśli używasz monitoringu cyklu retencji, ustaw także `RETENTION_HEARTBEAT_URL` i monitoruj harmonogram cron.
5. Sprawdź Regulamin i Politykę prywatności pod kątem rzeczywistej konfiguracji usług i operatora przed udostępnieniem aplikacji użytkownikom.

Nie uruchamiaj `prisma migrate reset` na bazie zawierającej dane, których nie chcesz usunąć.

## Backup bazy danych

Workflow `.github/workflows/database-backup.yml` wykonuje codzienny backup o **02:37 UTC**
(03:37 zimą / 04:37 latem w Polsce). Można go też uruchomić ręcznie przez
**Actions → Daily database backup → Run workflow**. Harmonogram działa po umieszczeniu
workflow na domyślnej gałęzi repozytorium; GitHub może opóźnić wykonanie.

### Konfiguracja

Wymagane sekrety GitHub Actions, również synchronizowane z Dopplera:

| Sekret                 | Zawartość                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`         | Bezpośrednie połączenie do bazy, której kopia ma powstać, bez poolingu   |
| `R2_ACCESS_KEY_ID`     | Access Key ID z uprawnieniami Object Read & Write tylko do bucketa kopii |
| `R2_SECRET_ACCESS_KEY` | Odpowiadający Secret Access Key                                          |
| `R2_ENDPOINT`          | Endpoint HTTPS S3 z Cloudflare, bez ścieżki bucketa                      |
| `R2_BUCKET_NAME`       | Nazwa prywatnego bucketa                                                 |
| `BACKUP_AGE_RECIPIENT` | Publiczny klucz odbiorcy age, zaczynający się od `age1`                  |

Konfiguracja Dopplera musi wskazywać właściwą bazę: nazwa konfiguracji `dev` nie
gwarantuje, że `DATABASE_URL` dotyczy produkcji. Workflow nie potrzebuje tokena
Cloudflare REST API, tokena Dopplera ani `DATABASE_URL_POOLED`.

### Klucze szyfrujące

Przed pierwszym uruchomieniem zainstaluj lokalnie [age](https://github.com/FiloSottile/age)
i wygeneruj klucz **poza repozytorium**:

```bash
age-keygen -o backup-key.txt
age-keygen -y backup-key.txt
```

Wynik drugiego polecenia to publiczny klucz do `BACKUP_AGE_RECIPIENT`. Prywatny plik
`backup-key.txt` przechowuj bezpiecznie poza GitHubem, z osobną kopią zapasową.
Bez niego nie odszyfrujesz backupów. Zachowaj też niezależnie
`INVOICE_DATA_ENCRYPTION_KEY`, w tym poprzednie wersje klucza odpowiadające kopiom:
sam dump nie zawiera klucza szyfrującego dane aplikacji.

### Przebieg i retencja kopii

Workflow dobiera wersję `pg_dump` do głównej wersji serwera, tworzy archiwum custom,
sprawdza jego spis zawartości, szyfruje przez age i wysyła wyłącznie zaszyfrowany plik
do `daily/` w R2. Sprawdza też rozmiar zapisanego obiektu i usuwa lokalne pliki po
zakończeniu zadania. Kopie nie trafiają do repozytorium ani artefaktów Actions.
Każdy błąd przerywa zadanie; włącz powiadomienia GitHub Actions o nieudanych workflow.

Bucket pozostaw prywatny, bez publicznego URL i domeny. Retencją zarządzaj przez
regułę lifecycle R2 dla prefiksu `daily/`, np. usuwanie po 30 dniach. Workflow sam
nie usuwa starych obiektów. Reguła lifecycle usuwa je również wtedy, gdy kolejne
backupy przestają działać, dlatego monitoruj wykonania.

### Odtwarzanie

Pobierz wybrany plik z R2 na zaufany komputer. Odszyfruj go i odtwórz **w osobnej,
pustej bazie**, używając klienta PostgreSQL w wersji zgodnej z kopią. Przykład dla
Bash z bezpośrednim adresem bazy docelowej w `RESTORE_DATABASE_URL`:

```bash
age --decrypt --identity backup-key.txt --output database.dump downloaded.dump.age
PGDATABASE="$RESTORE_DATABASE_URL" PGSSLMODE=require pg_restore \
  --exit-on-error --no-owner --no-acl database.dump
```

Nie wskazuj produkcyjnej bazy podczas próby odtworzenia. Sprawdzenie archiwum i
rozmiaru uploadu nie zastępuje próbnego odtworzenia oraz sprawdzenia danych aplikacji.
Po sprawdzeniu usuń lokalny odszyfrowany dump.

Kopia obejmuje schemat i dane dostępne dla roli z `DATABASE_URL`, nie konfigurację
usług Neon, OAuth, SMTP, sekrety ani role i uprawnienia PostgreSQL. Odtwarzanie
zarządzanych schematów Neon Auth wymaga osobnej weryfikacji. Kopia raz dziennie
oznacza możliwość utraty zmian od ostatniej udanej kopii.

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
npm run test:coverage
npm run format:check
```

Zakres i ograniczenia testów opisuje sekcja [Testy i pokrycie](#testy-i-pokrycie).

## Licencja

![GitHub License](https://img.shields.io/github/license/reisene/invoice-creator)

Projekt jest udostępniany na licencji GNU General Public License v3.0 lub nowszej. Szczegóły zawiera [LICENSE](./LICENSE).
