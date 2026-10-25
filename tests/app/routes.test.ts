// @vitest-environment node
import { GET as securityTxt } from '@/app/.well-known/security.txt/route';
import { GET as exportData } from '@/app/api/account/export/route';
import { GET as retention } from '@/app/api/cron/contact-retention/route';
import { GET as debugEnv } from '@/app/api/debug-env/route';
import { GET as health } from '@/app/api/health/route';
import { GET as sentryExample } from '@/app/api/sentry-example-api/route';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  rateLimit: vi.fn(),
  invoices: vi.fn(),
  parties: vi.fn(),
  bank: vi.fn(),
  consent: vi.fn(),
  updateInvoice: vi.fn(),
  findInvoice: vi.fn(),
  decrypt: vi.fn(),
  dependencies: vi.fn(),
  contactDelete: vi.fn(),
  termsDelete: vi.fn(),
  consentDelete: vi.fn(),
  heartbeat: vi.fn(),
  connection: vi.fn(),
  sentryLog: vi.fn(),
  handlerGet: vi.fn(),
  handlerPost: vi.fn(),
  handler: vi.fn(),
  articles: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  auth: { getSession: mocks.session, handler: mocks.handler },
}));
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: mocks.rateLimit }));
vi.mock('@/lib/savedDataAccess', () => ({
  getSavedInvoicesForUser: mocks.invoices,
  getSavedPartiesForUser: mocks.parties,
  getUserBankAccount: mocks.bank,
}));
vi.mock('@/lib/savedDataCrypto', () => ({ decryptJson: mocks.decrypt }));
vi.mock('@/lib/db', () => ({
  prisma: {
    invoice: { updateMany: mocks.updateInvoice, findFirst: mocks.findInvoice },
    cookieConsent: { findMany: mocks.consent, deleteMany: mocks.consentDelete },
    contactMessage: { deleteMany: mocks.contactDelete },
    termsAcceptance: { deleteMany: mocks.termsDelete },
  },
}));
vi.mock('@/lib/dependencyHealth', () => ({
  checkDependencies: mocks.dependencies,
}));
vi.mock('@/lib/retentionHeartbeat', () => ({
  sendRetentionHeartbeat: mocks.heartbeat,
}));
vi.mock('@/lib/legal/recordTermsAcceptance', () => ({
  getPendingMagicLinkAcceptanceCutoff: () => new Date('2026-09-01'),
}));
vi.mock('next/server', () => ({ connection: mocks.connection }));
vi.mock('@sentry/nextjs', () => ({ logger: { info: mocks.sentryLog } }));
vi.mock('@/lib/helpArticles', () => ({ getAllHelpArticles: mocks.articles }));
vi.mock('@/lib/siteUrl', () => ({ siteUrl: 'https://example.com' }));

const user = { id: 'user-1', email: 'jan@example.com', name: 'Jan' };
const invoice = {
  id: 'invoice-1',
  uid: 'd92da4c7-c999-4856-96d6-7681b1b96f71',
  invoiceNumber: '1/2026',
  title: 'Rachunek',
  contractNumber: 'U/1',
  updatedAt: '2026-10-01T00:00:00.000Z',
  data: 'encrypted',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T20:00:00Z'));
  mocks.session.mockResolvedValue({ data: { user } });
  mocks.rateLimit.mockResolvedValue({ ok: true });
  mocks.invoices.mockResolvedValue([invoice]);
  mocks.parties.mockResolvedValue([]);
  mocks.bank.mockResolvedValue(null);
  mocks.consent.mockResolvedValue([]);
  mocks.decrypt.mockReturnValue({ data: { grossAmount: 5000 } });
  mocks.updateInvoice.mockResolvedValue({ count: 1 });
  mocks.findInvoice.mockResolvedValue(null);
  mocks.contactDelete.mockResolvedValue({ count: 2 });
  mocks.termsDelete
    .mockResolvedValueOnce({ count: 3 })
    .mockResolvedValue({ count: 5 });
  mocks.consentDelete.mockResolvedValue({ count: 4 });
  mocks.heartbeat.mockResolvedValue('sent');
  mocks.articles.mockReturnValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(authorization?: string) {
  return new Request('https://example.com/api', {
    headers: authorization === undefined ? {} : { authorization },
  });
}

describe('health endpoint', () => {
  it('reports missing configuration before probing dependencies', async () => {
    vi.stubEnv('HEALTH_CHECK_SECRET', '');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await health(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Health check is not configured.',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(error).toHaveBeenCalledWith(
      '[health] HEALTH_CHECK_SECRET is not configured.',
    );
    expect(mocks.dependencies).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'Bearer wrong', 'test-health-secret'])(
    'rejects incorrect credentials: %s',
    async (authorization) => {
      vi.stubEnv('HEALTH_CHECK_SECRET', 'test-health-secret');
      const response = await health(request(authorization));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized.' });
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(mocks.dependencies).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['ok', 200],
    ['error', 503],
  ])('maps dependency status %s to HTTP %s', async (status, code) => {
    vi.stubEnv('HEALTH_CHECK_SECRET', 'test-health-secret');
    const result = { status, database: { status: 'ok', latencyMs: 1 } };
    mocks.dependencies.mockResolvedValue(result);
    const response = await health(request('Bearer test-health-secret'));
    expect(response.status).toBe(code);
    expect(await response.json()).toEqual(result);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.dependencies).toHaveBeenCalledOnce();
  });
});

describe('retention endpoint', () => {
  it('reports missing cron configuration', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await retention(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Scheduled job is not configured.',
    });
    expect(error).toHaveBeenCalled();
    expect(mocks.contactDelete).not.toHaveBeenCalled();
  });

  it.each([undefined, 'Bearer wrong'])(
    'rejects unauthenticated cleanup %s',
    async (authorization) => {
      vi.stubEnv('CRON_SECRET', 'test-cron-secret');
      const response = await retention(request(authorization));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized.' });
      expect(mocks.contactDelete).not.toHaveBeenCalled();
      expect(mocks.heartbeat).not.toHaveBeenCalled();
    },
  );

  it('deletes only eligible data and reports each count with heartbeat', async () => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    const response = await retention(request('Bearer test-cron-secret'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      deletedCount: 2,
      deletedPendingTermsAcceptances: 3,
      deletedCookieConsentLogs: 4,
      deletedReleasedTermsAcceptances: 5,
      heartbeat: 'sent',
    });
    expect(mocks.contactDelete).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
    expect(mocks.termsDelete).toHaveBeenNthCalledWith(1, {
      where: {
        userId: null,
        retainedForDispute: false,
        registrationMethod: 'MAGIC_LINK',
        acceptedAt: { lt: new Date('2026-09-01') },
      },
    });
    expect(mocks.termsDelete).toHaveBeenNthCalledWith(2, {
      where: {
        retainedForDispute: false,
        accountDeletionRequestedAt: { not: null },
      },
    });
    expect(mocks.consentDelete).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date('2026-09-21T20:00:00Z') } },
    });
    expect(mocks.heartbeat.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.consentDelete.mock.invocationCallOrder[0],
    );
  });

  it('propagates deletion failures and does not send a success heartbeat', async () => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    mocks.contactDelete.mockRejectedValue(new Error('db'));
    await expect(retention(request('Bearer test-cron-secret'))).rejects.toThrow(
      'db',
    );
    expect(mocks.heartbeat).not.toHaveBeenCalled();
  });
});

describe('account export', () => {
  it.each([null, {}])('requires a session: %j', async (data) => {
    mocks.session.mockResolvedValue({ data });
    const response = await exportData();
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Zaloguj się, aby pobrać dane.');
    expect(mocks.invoices).not.toHaveBeenCalled();
  });

  it('enforces export rate limits', async () => {
    mocks.rateLimit.mockResolvedValue({ ok: false, message: 'Limit' });
    const response = await exportData();
    expect(response.status).toBe(429);
    expect(await response.text()).toBe('Limit');
    expect(mocks.rateLimit).toHaveBeenCalledWith('exportData', user.id);
    expect(mocks.invoices).not.toHaveBeenCalled();
  });

  it('exports decrypted data with no internal IDs and download headers', async () => {
    const party = {
      id: 'internal',
      kind: 'CLIENT',
      clientType: 'company',
      name: 'Firma',
      address: 'Warszawa',
      nip: '123',
      pesel: null,
    };
    const bank = {
      accountHolder: 'Jan',
      bankName: 'Bank',
      accountNumber: '123',
    };
    const consent = [
      {
        choice: 'REJECT_OPTIONAL',
        consentVersion: '3',
        createdAt: '2026-10-01',
      },
    ];
    mocks.parties.mockResolvedValue([party]);
    mocks.bank.mockResolvedValue(bank);
    mocks.consent.mockResolvedValue(consent);
    const response = await exportData();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="moje-dane.json"',
    );
    expect(await response.json()).toEqual({
      version: 1,
      exportedAt: '2026-10-21T20:00:00.000Z',
      account: { name: user.name, email: user.email },
      bankAccount: bank,
      cookieConsent: consent,
      invoices: [
        {
          uid: invoice.uid,
          invoiceNumber: invoice.invoiceNumber,
          title: invoice.title,
          contractNumber: invoice.contractNumber,
          updatedAt: invoice.updatedAt,
          data: { grossAmount: 5000 },
        },
      ],
      parties: [
        {
          kind: party.kind,
          clientType: party.clientType,
          name: party.name,
          address: party.address,
          nip: party.nip,
          pesel: party.pesel,
        },
      ],
    });
    for (const fn of [mocks.invoices, mocks.parties, mocks.bank]) {
      expect(fn).toHaveBeenCalledWith(user.id);
    }
    expect(mocks.consent).toHaveBeenCalledWith({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { choice: true, consentVersion: true, createdAt: true },
    });
    expect(mocks.updateInvoice).not.toHaveBeenCalled();
  });

  it('backfills a legacy UID with a conditional owner-scoped update', async () => {
    mocks.invoices.mockResolvedValue([{ ...invoice, uid: null }]);
    const response = await exportData();
    const body = await response.json();
    const uid = body.invoices[0].uid;
    expect(uid).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.updateInvoice).toHaveBeenCalledWith({
      where: { id: invoice.id, userId: user.id, uid: null },
      data: { uid },
    });
    expect(mocks.findInvoice).not.toHaveBeenCalled();
  });

  it.each([null, { uid: null }, { uid: 'concurrent-uid' }])(
    'reads a concurrently assigned UID without overwriting it: %j',
    async (current) => {
      mocks.invoices.mockResolvedValue([{ ...invoice, uid: null }]);
      mocks.updateInvoice.mockResolvedValue({ count: 0 });
      mocks.findInvoice.mockResolvedValue(current);
      const response = await exportData();
      expect((await response.json()).invoices[0].uid).toBe(
        current?.uid ?? null,
      );
      expect(mocks.findInvoice).toHaveBeenCalledWith({
        where: { id: invoice.id, userId: user.id },
        select: { uid: true },
      });
    },
  );

  it('does not turn decryption failures into a successful export', async () => {
    mocks.decrypt.mockImplementation(() => {
      throw new Error('decrypt');
    });
    await expect(exportData()).rejects.toThrow('decrypt');
  });
});

describe('metadata and utility routes', () => {
  it('advertises Polish PWA metadata and both icon sizes', () => {
    expect(manifest()).toEqual({
      name: 'Invoice Creator',
      short_name: 'Invoice Creator',
      lang: 'pl',
      start_url: '/',
      display: 'standalone',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });
  });

  it.each(['development', 'test'])('disables indexing in %s', (environment) => {
    vi.stubEnv('NODE_ENV', environment);
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  it('allows production indexing but excludes private routes', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/auth', '/api'],
      },
      sitemap: 'https://example.com/sitemap.xml',
    });
  });

  it('includes public pages and every help article in the sitemap', () => {
    mocks.articles.mockReturnValue([
      { slugPath: 'zus/student' },
      { slugPath: 'podatki/pit' },
    ]);
    const entries = sitemap();
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://example.com/',
      'https://example.com/generator',
      'https://example.com/preview',
      'https://example.com/help',
      'https://example.com/help/zus/student',
      'https://example.com/help/podatki/pit',
      'https://example.com/contact',
      'https://example.com/terms',
      'https://example.com/privacy',
    ]);
    expect(entries[4]).toMatchObject({
      changeFrequency: 'monthly',
      priority: 0.7,
    });
    expect(entries.at(-1)).toMatchObject({
      changeFrequency: 'yearly',
      priority: 0.2,
    });
  });

  it('serves security contacts with an expiration exactly 180 UTC days ahead', async () => {
    const response = securityTxt();
    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe(
      [
        'Contact: https://github.com/reisene/invoice-creator/security/advisories/new',
        'Contact: mailto:contact@draugskoll.dev',
        'Expires: 2027-04-19T20:00:00.000Z',
        'Preferred-Languages: pl, en',
        'Canonical: https://invoice-creator.draugskoll.dev/.well-known/security.txt',
        '',
      ].join('\n'),
    );
  });

  it('serves the configured debug source, omitting undefined values', async () => {
    vi.stubEnv('DEBUG_ENV_SOURCE', 'test');
    expect(await (await debugEnv()).json()).toEqual({ value: 'test' });
    vi.stubEnv('DEBUG_ENV_SOURCE', undefined);
    expect(await (await debugEnv()).json()).toEqual({});
  });

  it('throws the intentional Sentry error only after opting out of prerendering', async () => {
    await expect(sentryExample()).rejects.toMatchObject({
      name: 'SentryExampleAPIError',
      message:
        'This error is raised on the backend called by the example page.',
    });
    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.sentryLog).toHaveBeenCalledWith('Sentry example API called');
  });

  it('exports the Neon auth route handlers unchanged', async () => {
    mocks.handler.mockReturnValue({
      GET: mocks.handlerGet,
      POST: mocks.handlerPost,
    });
    const handlers = await import('@/app/api/auth/[...path]/route');
    expect(handlers.GET).toBe(mocks.handlerGet);
    expect(handlers.POST).toBe(mocks.handlerPost);
    expect(mocks.handler).toHaveBeenCalledOnce();
  });
});
