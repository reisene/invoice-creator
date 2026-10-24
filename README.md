# Invoice Creator

[![Better Stack Badge](https://incidents.betterstack.com/status-badges/v1/monitor/30soy.svg)](https://incidents.betterstack.com/?utm_source=status_badge)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/47f0903270ca44c29b6de5f570582732)](https://app.codacy.com/gh/reisene/invoice-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Freisene%2Finvoice-creator)
[![Visual Studio Code](https://img.shields.io/badge/Editor-Visual%20Studio%20Code-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![WebStorm](https://img.shields.io/badge/Editor-WebStorm-000000?logo=webstorm&logoColor=white)](https://www.jetbrains.com/webstorm/)

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

- Node.js 24.x (zgodnie z `.nvmrc` i `engines` w `package.json`). W ustawieniach projektu Vercel wybierz tę samą linię Node.js.
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

`.env.example` zawiera szablon nazw i formatów. Źródłem sekretów jest Doppler: konfiguracja `dev` służy do lokalnego `npm run dev` i jest synchronizowana do sekretów GitHub Actions, a konfiguracje `stg` i `prd` są synchronizowane ze środowiskami Vercel (odpowiednio Preview i Production). Zmiany zmiennych wprowadzaj w Dopplerze, nie bezpośrednio w panelu Vercel ani GitHub, bo synchronizacja je nadpisze. Lokalny plik `.env.dev` odzwierciedla wartości używane przez GitHub Actions. Żadnego pliku `.env*` poza `.env.example` nie commituj.

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
- `npm test` — jednokrotnie uruchamia testy jednostkowe przez Vitest w środowisku jsdom.
- `npm run test:watch` — uruchamia Vitest w trybie obserwowania zmian.
- `npm run test:coverage` — uruchamia testy i generuje raporty pokrycia w katalogu `coverage/`.
- `npm run db:seed` — wypełnia bazę przykładowymi parametrami podatkowymi.
- `npm run format:check` — sprawdza formatowanie Prettierem.

### Testy katalogu `app/`

Testy w `tests/app/` korzystają z istniejącego `vitest.config.mts`.
Obejmują akcje serwerowe, endpointy API, metadane, strony i interakcje
formularzy. Usługi zewnętrzne, uwierzytelnianie i baza są mockowane; testy
nie wymagają połączenia z produkcyjnymi usługami.

```bash
npm test -- tests/app
npm run test:coverage -- tests/app --coverage.include="app/**/*.ts" --coverage.include="app/**/*.tsx"
```

Progi wynoszą 95% instrukcji, linii i funkcji oraz 90% gałęzi.
Pomiar uwzględnia również niewczytane pliki wybranego katalogu. Standardowe
`npm run test:coverage` raportuje i egzekwuje progi dla wszystkich katalogów
źródłowych wskazanych w konfiguracji, także tych jeszcze nieobjętych etapem testów.

Testy komponentów klienckich korzystają z jsdom inicjalizowanego przez
`tests/app/dom.ts` po uruchomieniu workera, aby uniknąć limitu czasu jego
startu. Testy stron asynchronicznych sprawdzają funkcje stron, przekierowania
i zwracane elementy; nie zastępują testów E2E renderowania React Server
Components w działającym Next.js.

### Testy katalogu `lib/`

Testy w `tests/lib/` obejmują cały `lib/`, w tym podkatalogi `auth/`,
`invoice/` i `legal/`. Korzystają z tej samej konfiguracji Vitest oraz
środowiska Node.js. Sprawdzają walidację, wyliczenia i limity podatkowe,
szyfrowanie, migrację danych, numerację rachunków, zgody, retencję,
limity żądań, treści pomocy i obsługę błędów usług zewnętrznych.
Połączenia z bazą, Neon Auth, Upstash i Resend są mockowane.
Testy szyfrowania korzystają z prawdziwego AES-GCM i HMAC na kluczu testowym.

```bash
npm test -- tests/lib
npm run test:coverage -- tests/lib --coverage.include="lib/**/*.ts" --coverage.include="lib/**/*.tsx"
```

Pomiar tylko `lib/` sprawdza te same progi 95%/95%/95%/90% dla całego tego
katalogu, również plików niewczytanych przez testy. Pełny raport może nie
spełniać progów, dopóki testami nie zostaną objęte pozostałe katalogi.

Workflow `Code quality` sprawdza lintowanie i formatowanie dla pull requestów oraz zmian w `main` i `develop`. Nie uruchamia testów. Build sprawdza Vercel przy każdym wdrożeniu (także preview). Pozostałe workflow: CodeQL, gałąź Neon dla pull requestów (wygasa po 14 dniach; wymaga sekretu `NEON_API_KEY` i zmiennej `NEON_PROJECT_ID`), labeler oraz codzienny backup bazy. Zależności aktualizuje cotygodniowo Dependabot. Aby blokował scalanie przy błędach, dodaj kontrolę `Lint and formatting` do wymaganych kontroli w regułach ochrony gałęzi GitHub. Instalacja na Vercelu i w tym workflow korzysta z `npm ci`, bez aktualizowania lockfile.

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
```

Aktualny zestaw testów zawiera testy jednostkowe kalkulacji rachunku i walidacji zmiennych środowiskowych; projekt nie deklaruje w tym README pokrycia testami E2E ani integracyjnymi.

## Licencja

![GitHub License](https://img.shields.io/github/license/reisene/invoice-creator)

Projekt jest udostępniany na licencji GNU General Public License v3.0 lub nowszej. Szczegóły zawiera [LICENSE](./LICENSE).
