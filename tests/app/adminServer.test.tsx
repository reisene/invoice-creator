// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  counts: {
    invoice: vi.fn(),
    contactMessage: vi.fn(),
    termsAcceptance: vi.fn(),
    cookieConsent: vi.fn(),
    taxParam: vi.fn(),
  },
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/admin/requireAdmin', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    invoice: { count: mocks.counts.invoice },
    contactMessage: { count: mocks.counts.contactMessage },
    termsAcceptance: { count: mocks.counts.termsAcceptance },
    cookieConsent: { count: mocks.counts.cookieConsent },
    taxParam: {
      count: mocks.counts.taxParam,
      create: mocks.create,
      findMany: mocks.findMany,
    },
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/components/admin/TaxParamForm', () => ({
  default: () => <div>tax-form</div>,
}));
vi.mock('@/components/admin/AdminNavigation', () => ({
  default: () => <nav>admin-nav</nav>,
}));
vi.mock('@/components/admin/UserList', () => ({
  default: () => <div>user-list</div>,
}));

const { createTaxParamAction } = await import('@/components/admin/actions');
const { default: AdminPage } = await import('@/app/admin/page');
const { default: TaxParamsPage } = await import('@/app/admin/tax-params/page');
const { default: AdminLayout } = await import('@/app/admin/layout');
const { default: UsersPage } = await import('@/app/admin/users/page');

const fields: Record<string, string> = {
  year: '2026',
  pensionRate: '0.0976',
  rentRate: '0.015',
  sicknessRate: '0.0245',
  healthRate: '0.09',
  taxRate1: '0.12',
  taxRate2: '0.32',
  taxThreshold: '120000',
  monthlyTaxReduction: '300',
  yearlyYoungReliefLimit: '85528',
  zusLimitMultiple: '30',
  minimumWage: '4806',
  costRateStandard: '0.2',
  costRateArtistic: '0.5',
};

function buildForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...fields, ...overrides })) {
    fd.set(k, v);
  }
  return fd;
}

const initial = { ok: false, message: '' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: 'a1', email: 'admin@test.pl' });
  mocks.create.mockResolvedValue({});
});

describe('createTaxParamAction', () => {
  it('creates params and revalidates', async () => {
    const result = await createTaxParamAction(
      initial,
      buildForm({ comment: '  uwaga ' }),
    );
    expect(result).toEqual({
      ok: true,
      message: 'Dodano parametry podatkowe dla roku 2026',
    });
    const data = mocks.create.mock.calls[0][0].data;
    expect(data.createdBy).toBe('admin@test.pl');
    expect(data.comment).toBe('uwaga');
    expect(data.year).toBe(2026);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/tax-params');
  });

  it('falls back to admin id and null comment', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'a1', email: '' });
    await createTaxParamAction(initial, buildForm());
    const data = mocks.create.mock.calls[0][0].data;
    expect(data.createdBy).toBe('a1');
    expect(data.comment).toBeNull();
  });

  it('reports missing required field', async () => {
    const fd = buildForm();
    fd.delete('pensionRate');
    const result = await createTaxParamAction(initial, fd);
    expect(result).toEqual({
      ok: false,
      message: 'Brak wymaganego pola: pensionRate',
    });
  });

  it('reports blank field', async () => {
    const result = await createTaxParamAction(
      initial,
      buildForm({ year: '   ' }),
    );
    expect(result.ok).toBe(false);
  });

  it('reports non-integer year', async () => {
    const result = await createTaxParamAction(
      initial,
      buildForm({ year: 'abc' }),
    );
    expect(result).toEqual({
      ok: false,
      message: 'Pole year musi być liczbą całkowitą',
    });
  });

  it('returns error message from database failure', async () => {
    mocks.create.mockRejectedValue(new Error('duplikat'));
    const result = await createTaxParamAction(initial, buildForm());
    expect(result).toEqual({ ok: false, message: 'duplikat' });
  });

  it('returns generic message for non-Error throw', async () => {
    mocks.create.mockRejectedValue('boom');
    const result = await createTaxParamAction(initial, buildForm());
    expect(result).toEqual({ ok: false, message: 'Nieznany błąd' });
  });
});

describe('admin pages', () => {
  it('renders dashboard counts', async () => {
    mocks.counts.invoice.mockResolvedValue(11);
    mocks.counts.contactMessage.mockResolvedValue(22);
    mocks.counts.termsAcceptance.mockResolvedValue(33);
    mocks.counts.cookieConsent.mockResolvedValue(44);
    mocks.counts.taxParam.mockResolvedValue(55);
    const html = renderToStaticMarkup(await AdminPage());
    for (const n of ['11', '22', '33', '44', '55']) {
      expect(html).toContain(`>${n}<`);
    }
  });

  it('renders empty tax params list', async () => {
    mocks.findMany.mockResolvedValue([]);
    const html = renderToStaticMarkup(await TaxParamsPage());
    expect(html).toContain('Brak parametrów');
    expect(html).toContain('tax-form');
  });

  it('renders tax params rows', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: '1',
        year: 2026,
        pensionRate: '0.0976',
        rentRate: '0.015',
        sicknessRate: '0.0245',
        healthRate: '0.09',
        taxRate1: '0.12',
        taxRate2: '0.32',
        taxThreshold: '120000',
        minimumWage: '4806',
        createdAt: new Date('2026-01-02T12:00:00Z'),
        createdBy: 'admin@test.pl',
      },
    ]);
    const html = renderToStaticMarkup(await TaxParamsPage());
    expect(html).toContain('2026');
    expect(html).toContain('admin@test.pl');
    expect(html).not.toContain('Brak parametrów');
  });

  it('renders layout after admin check', async () => {
    const html = renderToStaticMarkup(
      await AdminLayout({ children: <p>child</p> }),
    );
    expect(mocks.requireAdmin).toHaveBeenCalled();
    expect(html).toContain('admin-nav');
    expect(html).toContain('child');
  });

  it('renders users page', () => {
    const html = renderToStaticMarkup(<UsersPage />);
    expect(html).toContain('user-list');
    expect(html).toContain('Użytkownicy');
  });
});
