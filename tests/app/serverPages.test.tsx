// @vitest-environment node
import InvoicesPage from '@/app/account/invoices/page';
import AccountLayout from '@/app/account/layout';
import AccountPage from '@/app/account/page';
import SessionsCard from '@/app/account/SessionsCard';
import DeleteAccountPage from '@/app/auth/delete-account/page';
import ForgotLayout from '@/app/auth/forgot-password/layout';
import AuthLayout from '@/app/auth/layout';
import MagicLayout from '@/app/auth/magic-link/layout';
import MagicPage from '@/app/auth/magic-link/page';
import ResetLayout from '@/app/auth/reset-password/layout';
import SignInLayout from '@/app/auth/sign-in/layout';
import SignUpLayout from '@/app/auth/sign-up/layout';
import SignUpPage from '@/app/auth/sign-up/page';
import TermsCheck from '@/app/auth/terms-check/page';
import VerifyLayout from '@/app/auth/verify-email/layout';
import ContactPage from '@/app/contact/page';
import CookiesPage from '@/app/cookies/page';
import GeneratorPage from '@/app/generator/page';
import HelpArticle, {
  generateMetadata,
  generateStaticParams,
} from '@/app/help/[...slug]/page';
import HelpPage from '@/app/help/page';
import RootLayout, { metadata, viewport } from '@/app/layout';
import Loading from '@/app/loading';
import NotFound from '@/app/not-found';
import Home from '@/app/page';
import PreviewPage from '@/app/preview/page';
import PrivacyPage from '@/app/privacy/page';
import AcceptTermsPage from '@/app/terms/accept/page';
import TermsPage from '@/app/terms/page';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  accounts: vi.fn(),
  sessions: vi.fn(),
  user: vi.fn(),
  bank: vi.fn(),
  invoices: vi.fn(),
  invoice: vi.fn(),
  parties: vi.fn(),
  tax: vi.fn(),
  log: vi.fn(),
  connection: vi.fn(),
  claim: vi.fn(),
  hasTerms: vi.fn(),
  cookie: vi.fn(),
  history: vi.fn(),
  articles: vi.fn(),
  article: vi.fn(),
  adjacent: vi.fn(),
  category: vi.fn(),
  sentry: vi.fn(),
  tag: vi.fn(),
  context: vi.fn(),
  generator: vi.fn(),
  profile: vi.fn(),
  password: vi.fn(),
  contact: vi.fn(),
  preview: vi.fn(),
  help: vi.fn(),
  magic: vi.fn(),
  signup: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn((): never => {
    throw new Error('NOT_FOUND');
  }),
}));
vi.mock('@/lib/auth/server', () => ({
  auth: {
    getSession: mocks.session,
    listAccounts: mocks.accounts,
    listSessions: mocks.sessions,
  },
}));
vi.mock('@/lib/currentUser', () => ({ getCurrentUserIdWithTerms: mocks.user }));
vi.mock('@/lib/savedDataAccess', () => ({
  getUserBankAccount: mocks.bank,
  getSavedInvoicesForUser: mocks.invoices,
  getSavedInvoiceForUser: mocks.invoice,
  getSavedPartiesForUser: mocks.parties,
}));
vi.mock('@/lib/invoice/taxParams', () => ({ getAllTaxParams: mocks.tax }));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));
vi.mock('@/lib/db', () => ({
  prisma: { cookieConsent: { findMany: mocks.history } },
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.cookie }),
}));
vi.mock('next/server', () => ({ connection: mocks.connection }));
vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'sans-font' }),
  Geist_Mono: () => ({ variable: 'mono-font' }),
}));
vi.mock('@/lib/siteUrl', () => ({ siteUrl: 'https://example.com' }));
vi.mock('@/lib/legal/legalDocuments', () => ({
  getCurrentLegalDocument: () => ({
    version: '2026-01',
    effectiveDate: '2026-01-15',
    Content: () => 'Legal document body',
  }),
}));
vi.mock('@/lib/legal/recordTermsAcceptance', () => ({
  claimPendingMagicLinkAcceptance: mocks.claim,
  hasCurrentTermsAcceptance: mocks.hasTerms,
}));
vi.mock('@/lib/helpArticles', () => ({
  getAllHelpArticles: mocks.articles,
  getArticleBySlug: mocks.article,
  getAdjacentArticles: mocks.adjacent,
  getCategoryArticles: mocks.category,
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.sentry,
  withScope: (
    callback: (scope: {
      setTag: typeof mocks.tag;
      setContext: typeof mocks.context;
    }) => void,
  ) => callback({ setTag: mocks.tag, setContext: mocks.context }),
}));
vi.mock('@/components/generator/GeneratorClient', () => ({
  default: mocks.generator,
}));
vi.mock('@/app/account/AccountForms', () => ({
  ProfileForm: mocks.profile,
  PasswordForm: mocks.password,
  BankAccountForm: () => 'Bank form',
  DeleteAccountForm: () => 'Delete form',
  EmailChangeForm: () => 'Email form',
}));
vi.mock('@/app/account/ImportDataCard', () => ({
  ImportDataCard: () => 'Import form',
}));
vi.mock('@/app/account/SessionActions', () => ({
  SessionActionButton: ({ label }: { label: string }) => label,
}));
vi.mock('@/app/account/invoices/PartyEditor', () => ({
  default: () => 'Party editor',
}));
vi.mock('@/app/account/invoices/DeleteSavedDataButton', () => ({
  default: () => 'Delete button',
}));
vi.mock('@/app/contact/ContactForm', () => ({ default: mocks.contact }));
vi.mock('@/app/preview/PreviewClient', () => ({ default: mocks.preview }));
vi.mock('@/app/help/HelpIndexClient', () => ({ default: mocks.help }));
vi.mock('@/app/auth/magic-link/MagicLinkForm', () => ({
  default: mocks.magic,
}));
vi.mock('@/app/auth/sign-up/SignUpForm', () => ({ default: mocks.signup }));
vi.mock('@/app/terms/accept/AcceptanceForm', () => ({
  default: ({ termsVersion }: { termsVersion: string }) =>
    `Accept ${termsVersion}`,
}));
vi.mock('@/components/consent/ClearCookieConsentButton', () => ({
  default: () => 'Clear consent',
}));
vi.mock('@/components/AppNavbar', () => ({
  default: ({ authButtons }: { authButtons: ReactNode }) => (
    <nav>{authButtons}</nav>
  ),
}));
vi.mock('@/components/AuthButtons', () => ({ default: () => 'Auth buttons' }));
vi.mock('@/components/consent/CookieConsent', () => ({
  default: () => 'Cookie consent',
}));
vi.mock('@/components/telemetry/ConsentedTelemetry', () => ({
  default: () => 'Telemetry gate',
}));
vi.mock('@/components/telemetry/ConsentedSentryReplay', () => ({
  default: () => 'Replay gate',
}));
vi.mock('@/components/Footer', () => ({
  default: () => <footer>Footer</footer>,
}));
vi.mock('@/components/Home/Hero', () => ({ default: () => 'Hero' }));
vi.mock('@/components/Home/Features', () => ({ default: () => 'Features' }));
vi.mock('@/components/Home/HowItWorks', () => ({
  default: () => 'How it works',
}));
vi.mock('@/components/Home/InvoiceContent', () => ({
  default: () => 'Invoice content',
}));
vi.mock('@/components/Home/HelpArticlesSection', () => ({
  default: () => 'Help articles',
}));
vi.mock('@/components/Home/CtaBanner', () => ({ default: () => 'CTA' }));

const user = {
  id: 'user-1',
  email: 'jan@example.com',
  name: 'Jan',
  emailVerified: true,
};
const article = {
  slug: ['podstawy', 'czym-jest-rachunek-do-umowy-zlecenia'],
  slugPath: 'podstawy/czym-jest-rachunek-do-umowy-zlecenia',
  title: 'Rachunek',
  description: 'Opis rachunku',
  category: 'podstawy',
  categoryLabel: 'Podstawy',
  tags: ['rachunek'],
};
const render = (node: ReactNode) => renderToStaticMarkup(node);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  });
  mocks.session.mockResolvedValue({
    data: { user, session: { id: 'current' } },
  });
  mocks.accounts.mockResolvedValue({ data: [], error: null });
  mocks.sessions.mockResolvedValue({ data: [], error: null });
  mocks.user.mockResolvedValue(user.id);
  mocks.bank.mockResolvedValue(null);
  mocks.invoices.mockResolvedValue([]);
  mocks.parties.mockResolvedValue([]);
  mocks.invoice.mockResolvedValue(null);
  mocks.tax.mockResolvedValue([DEFAULT_TAX_PARAMS]);
  mocks.hasTerms.mockResolvedValue(false);
  mocks.cookie.mockReturnValue(undefined);
  mocks.history.mockResolvedValue([]);
  mocks.articles.mockReturnValue([article]);
  mocks.article.mockReturnValue(article);
  mocks.adjacent.mockReturnValue({ prev: null, next: null });
  mocks.category.mockReturnValue([article]);
  for (const fn of [
    mocks.generator,
    mocks.profile,
    mocks.password,
    mocks.contact,
    mocks.preview,
    mocks.help,
    mocks.magic,
    mocks.signup,
  ]) {
    fn.mockReturnValue(null);
  }
});

describe('layouts and public pages', () => {
  it.each([
    AuthLayout,
    ForgotLayout,
    MagicLayout,
    ResetLayout,
    SignInLayout,
    SignUpLayout,
    VerifyLayout,
  ])('preserves children in auth layout %#', (Layout) => {
    expect(Layout({ children: 'Child content' })).toBe('Child content');
  });
  it('requires authentication for the private layout', async () => {
    expect(await AccountLayout({ children: 'Private content' })).toBe(
      'Private content',
    );
    mocks.user.mockResolvedValue(null);
    await expect(
      AccountLayout({ children: 'Private content' }),
    ).rejects.toThrow('REDIRECT:/auth/sign-in');
  });
  it('renders root landmarks, gated telemetry and Polish metadata', () => {
    const html = render(
      RootLayout({ children: 'Page content', params: Promise.resolve({}) }),
    );
    expect(html).toContain('lang="pl"');
    expect(html).toContain('sans-font mono-font');
    for (const content of [
      'Page content',
      'Auth buttons',
      'Cookie consent',
      'Telemetry gate',
      'Replay gate',
      'Footer',
    ]) {
      expect(html).toContain(content);
    }
    expect(String(metadata.metadataBase)).toBe('https://example.com/');
    expect(viewport).toEqual({ width: 'device-width', initialScale: 1 });
  });
  it('composes all home sections', () => {
    const html = render(<Home />);
    for (const section of [
      'Hero',
      'Features',
      'How it works',
      'Invoice content',
      'Help articles',
      'CTA',
    ])
      expect(html).toContain(section);
  });
  it('renders loading status and working not-found navigation', () => {
    expect(render(<Loading />)).toContain('role="status"');
    expect(render(<Loading />)).toContain('Ładowanie');
    const html = render(<NotFound />);
    expect(html).toContain('404');
    expect(html).toContain('href="/generator"');
    expect(html).toContain('href="/"');
  });
  it.each([
    ['terms', TermsPage],
    ['privacy', PrivacyPage],
  ] as const)(
    'renders current %s document and effective date',
    async (_kind, Page) => {
      const html = render(await Page());
      expect(html).toContain('Legal document body');
      expect(html).toContain('2026-01');
      expect(html).toContain('15 stycznia 2026');
      expect(mocks.connection).toHaveBeenCalled();
    },
  );
  it('wires preview tax parameters and help article metadata', async () => {
    render(await PreviewPage());
    expect(mocks.preview).toHaveBeenCalledWith(
      { taxParams: [DEFAULT_TAX_PARAMS] },
      undefined,
    );
    render(<HelpPage />);
    expect(mocks.help).toHaveBeenCalledWith({ articles: [article] }, undefined);
  });
  it.each([MagicPage, SignUpPage])(
    'loads the current terms version for registration page %#',
    async (Page) => {
      const element = await Page();
      expect(element.props).toEqual({ termsVersion: '2026-01' });
      expect(mocks.connection).toHaveBeenCalled();
    },
  );
  it.each([null, { user }])(
    'prefills contact data only from the current session %j',
    async (data) => {
      mocks.session.mockResolvedValue({ data });
      const html = render(await ContactPage());
      expect(html).toContain('Skontaktuj się z nami');
      expect(html).toContain('https://github.com/reisene/invoice-creator');
      expect(mocks.contact).toHaveBeenCalledWith(
        {
          defaultName: data?.user.name ?? '',
          defaultEmail: data?.user.email ?? '',
        },
        undefined,
      );
    },
  );
});

describe('generator page data flow', () => {
  it.each([null, user.id])('loads initial data for %s', async (id) => {
    mocks.user.mockResolvedValue(id);
    const element = await GeneratorPage({ searchParams: Promise.resolve({}) });
    expect(element.props).toEqual({
      taxParams: [DEFAULT_TAX_PARAMS],
      signedIn: Boolean(id),
      initialParties: [],
      bankAccount: null,
      initialInvoice: undefined,
      duplicateData: undefined,
    });
    expect(element.key).toBe('new');
    if (!id) expect(mocks.bank).not.toHaveBeenCalled();
  });
  it('opens a saved invoice scoped to the current owner', async () => {
    const data = SAMPLE_INVOICE_PRESETS[0].formData;
    mocks.invoice.mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: '1/2026',
      data,
    });
    const element = await GeneratorPage({
      searchParams: Promise.resolve({ invoice: 'invoice-1' }),
    });
    expect(element.props.initialInvoice).toEqual({
      id: 'invoice-1',
      invoiceNumber: '1/2026',
      data,
    });
    expect(element.key).toBe('invoice-1');
    expect(mocks.invoice).toHaveBeenCalledWith(user.id, 'invoice-1');
  });
  it.each([null, { data: null }])(
    'does not prefill missing or unreadable invoices %j',
    async (saved) => {
      mocks.invoice.mockResolvedValue(saved);
      expect(
        (
          await GeneratorPage({
            searchParams: Promise.resolve({ invoice: 'missing' }),
          })
        ).props.initialInvoice,
      ).toBeUndefined();
    },
  );
  it.each([true, false])(
    'prioritizes duplication without carrying the source identity, exists=%s',
    async (exists) => {
      const data = SAMPLE_INVOICE_PRESETS[0].formData;
      mocks.invoice.mockResolvedValue(exists ? { data } : null);
      const element = await GeneratorPage({
        searchParams: Promise.resolve({ invoice: 'edit', duplicate: 'copy' }),
      });
      expect(element.props.duplicateData).toEqual(exists ? data : undefined);
      expect(element.props.initialInvoice).toBeUndefined();
      expect(element.key).toBe('dup-copy');
      expect(mocks.invoice).toHaveBeenCalledWith(user.id, 'copy');
    },
  );
  it.each([
    { invoice: ['id'] },
    { invoice: 'x'.repeat(101) },
    { duplicate: ['id'] },
    { duplicate: 'x'.repeat(101) },
  ])('ignores invalid route identifiers %j', async (query) => {
    await GeneratorPage({ searchParams: Promise.resolve(query) });
    expect(mocks.invoice).not.toHaveBeenCalled();
  });
});

describe('account pages', () => {
  it.each([
    AccountPage,
    InvoicesPage,
    DeleteAccountPage,
    AcceptTermsPage,
    TermsCheck,
  ])('redirects anonymous users from private page %#', async (Page) => {
    mocks.session.mockResolvedValue({ data: null });
    mocks.user.mockResolvedValue(null);
    await expect(Page()).rejects.toThrow('REDIRECT:/auth/sign-in');
  });
  it('allows deletion without new terms acceptance', async () => {
    mocks.user.mockResolvedValue(null);
    expect(render(await DeleteAccountPage())).toContain(
      'nie wymaga akceptacji',
    );
    expect(mocks.user).not.toHaveBeenCalled();
  });
  it('redirects a terms-checked user home', async () => {
    await expect(TermsCheck()).rejects.toThrow('REDIRECT:/');
  });
  it.each([
    { data: [{ providerId: 'credential' }], error: null },
    { data: [{ providerId: 'google' }], error: null },
    { data: null, error: null },
    { data: [], error: new Error('accounts') },
  ])(
    'derives password support without silently treating failures as passwordless %j',
    async (result) => {
      mocks.accounts.mockResolvedValue(result);
      // Resolve the nested async server component separately, as an RSC renderer would.
      const element = await AccountPage();
      expect(element.props.children).toBeDefined();
      expect(mocks.bank).toHaveBeenCalledWith(user.id);
      if (result.error || result.data === null)
        expect(mocks.log).toHaveBeenCalledWith(
          'account.listAccounts',
          expect.any(Error),
        );
    },
  );
  it('renders empty saved data with creation links', async () => {
    const html = render(await InvoicesPage());
    expect(html).toContain('Nie masz jeszcze zapisanych rachunków');
    expect(html).toContain('Brak zapisanych danych');
  });
  it('renders invoice amounts, dates, owner links and both party roles', async () => {
    mocks.invoices.mockResolvedValue([
      {
        id: 'invoice-1',
        title: 'Rachunek',
        invoiceNumber: '1/2026',
        periodStart: '2026-01-01',
        net: 1234.5,
        updatedAt: new Date('2026-01-02'),
      },
    ]);
    mocks.parties.mockResolvedValue([
      { id: 'p1', kind: 'CLIENT', name: 'Firma', address: 'Warszawa' },
      { id: 'p2', kind: 'CONTRACTOR', name: 'Jan', address: 'Kraków' },
    ]);
    const html = render(await InvoicesPage());
    for (const text of [
      '1234,50 zł',
      '1/2026',
      '?invoice=invoice-1',
      '?duplicate=invoice-1',
      'Zleceniodawca',
      'Zleceniobiorca',
    ])
      expect(html).toContain(text);
  });
  it.each([true, false])(
    'claims pending magic-link consent only when an email is available: %s',
    async (hasEmail) => {
      mocks.session.mockResolvedValue({
        data: { user: { id: user.id, email: hasEmail ? user.email : '' } },
      });
      expect(render(await AcceptTermsPage())).toContain('Accept 2026-01');
      if (hasEmail)
        expect(mocks.claim).toHaveBeenCalledWith(user.id, user.email);
      else expect(mocks.claim).not.toHaveBeenCalled();
    },
  );
  it('redirects users who have already accepted the current terms', async () => {
    mocks.hasTerms.mockResolvedValue(true);
    await expect(AcceptTermsPage()).rejects.toThrow('REDIRECT:/');
  });
});

describe('session and cookie history', () => {
  it.each([
    { data: null, error: null },
    { data: [], error: new Error('sessions') },
  ])('reports unavailable session lists %j', async (result) => {
    mocks.sessions.mockResolvedValue(result);
    expect(render(await SessionsCard())).toContain(
      'Nie udało się pobrać aktywnych sesji',
    );
    expect(mocks.log).toHaveBeenCalled();
  });
  it.each([null, { data: null }, { data: {}, error: new Error('current') }])(
    'reports unavailable current-session data %j',
    async (result) => {
      mocks.session.mockResolvedValue(result ?? { data: null });
      expect(render(await SessionsCard())).toContain(
        'Nie udało się pobrać aktywnych sesji',
      );
    },
  );
  it('renders an empty list explicitly', async () => {
    expect(render(await SessionsCard())).toContain('Brak aktywnych sesji');
  });
  it('sorts sessions newest first and describes browsers and devices', async () => {
    const agents = [
      ['Edg/1 Windows', 'Edge (Windows)'],
      ['OPR/1 Android', 'Opera (Android)'],
      ['Chrome/1 iPhone', 'Chrome (iOS)'],
      ['Firefox/1 Mac OS', 'Firefox (macOS)'],
      ['Safari/1 Linux', 'Safari (Linux)'],
      ['Custom', 'Przeglądarka'],
      [null, 'Nieznane urządzenie'],
    ];
    mocks.sessions.mockResolvedValue({
      data: agents.map(([agent], index) => ({
        id: index === 0 ? 'current' : `s${index}`,
        userAgent: agent,
        ipAddress: index === 0 ? '127.0.0.1' : null,
        createdAt: new Date(`2026-01-${String(index + 1).padStart(2, '0')}`),
      })),
    });
    const html = render(await SessionsCard());
    for (const [, label] of agents) expect(html).toContain(label);
    expect(html.indexOf('Nieznane urządzenie')).toBeLessThan(
      html.indexOf('Edge (Windows)'),
    );
    expect(html).toContain('Ta sesja');
    expect(html).toContain('127.0.0.1');
    expect(html).toContain('Wyloguj z pozostałych urządzeń');
  });
  it.each([
    [undefined, 'Brak aktualnego wyboru'],
    ['3:ACCEPT_OPTIONAL', 'Brak aktualnego wyboru'],
    ['4:ACCEPT_OPTIONAL', 'Analityka i wydajność oraz odtwarzanie sesji'],
    ['4:REJECT_OPTIONAL', 'Tylko niezbędne'],
    ['4:ACCEPT_ANALYTICS', 'Tylko analityka i wydajność'],
    ['4:ACCEPT_REPLAY', 'Tylko odtwarzanie sesji'],
  ])(
    'renders current cookie choice %s for anonymous users',
    async (value, label) => {
      mocks.cookie.mockReturnValue(value ? { value } : undefined);
      mocks.session.mockResolvedValue({ data: null });
      const html = render(await CookiesPage());
      expect(html).toContain(label);
      expect(html).toContain('w rejestrze bez identyfikatora Konta');
      expect(mocks.history).not.toHaveBeenCalled();
    },
  );
  it('renders empty and populated user cookie history', async () => {
    expect(render(await CookiesPage())).toContain('Brak decyzji zapisanych');
    mocks.history.mockResolvedValue([
      {
        id: 'c1',
        choice: 'ACCEPT_OPTIONAL',
        consentVersion: '3',
        createdAt: new Date('2026-10-01'),
      },
      {
        id: 'c2',
        choice: 'REJECT_OPTIONAL',
        consentVersion: '3',
        createdAt: new Date('2026-10-02'),
      },
      {
        id: 'c3',
        choice: 'ACCEPT_ANALYTICS',
        consentVersion: '4',
        createdAt: new Date('2026-10-25'),
      },
      {
        id: 'c4',
        choice: 'ACCEPT_REPLAY',
        consentVersion: '4',
        createdAt: new Date('2026-10-25'),
      },
    ]);
    const html = render(await CookiesPage());
    expect(html).toContain('2026-10-01T00:00:00.000Z');
    expect(html).toContain('Analityka i wydajność oraz odtwarzanie sesji');
    expect(html).toContain('Tylko niezbędne');
    expect(html).toContain('Tylko analityka i wydajność');
    expect(html).toContain('Tylko odtwarzanie sesji');
    expect(mocks.history).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: user.id, createdAt: { gte: expect.any(Date) } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  });
});

describe('help articles', () => {
  const params = () => ({ params: Promise.resolve({ slug: article.slug }) });
  it('generates all static paths and canonical article metadata', async () => {
    expect(await generateStaticParams()).toEqual([{ slug: article.slug }]);
    expect(await generateMetadata(params())).toMatchObject({
      title: 'Rachunek – Pomoc i Baza Wiedzy',
      description: article.description,
      alternates: { canonical: `/help/${article.slugPath}` },
      openGraph: { type: 'article', url: `/help/${article.slugPath}` },
    });
  });
  it('returns not-found metadata and a 404 for missing articles', async () => {
    mocks.article.mockReturnValue(null);
    expect(await generateMetadata(params())).toEqual({
      title: 'Artykuł nie został odnaleziony – Pomoc',
    });
    await expect(HelpArticle(params())).rejects.toThrow('NOT_FOUND');
  });
  it('logs MDX loading failures before returning a 404', async () => {
    mocks.article.mockReturnValue({
      ...article,
      slug: ['missing'],
      slugPath: 'missing',
    });
    await expect(HelpArticle(params())).rejects.toThrow('NOT_FOUND');
    expect(mocks.sentry).toHaveBeenCalled();
    expect(mocks.context).toHaveBeenCalledWith('help_article', {
      slug: 'missing',
    });
  });
  it.each([false, true])(
    'renders article content and optional navigation/related articles: %s',
    async (withRelated) => {
      const other = { ...article, slugPath: 'other', title: 'Other article' };
      mocks.category.mockReturnValue(
        withRelated ? [article, other] : [article],
      );
      mocks.adjacent.mockReturnValue(
        withRelated ? { prev: other, next: other } : { prev: null, next: null },
      );
      const html = render(await HelpArticle(params()));
      expect(html).toContain(
        'Czym jest rachunek do umowy zlecenia i kiedy go wystawiać?',
      );
      expect(html).toContain('#rachunek');
      if (withRelated) {
        expect(html).toContain('Other article');
        expect(html).toContain('Poprzedni artykuł');
        expect(html).toContain('Następny artykuł');
      } else {
        expect(html).not.toContain('Other article');
      }
    },
  );
});
