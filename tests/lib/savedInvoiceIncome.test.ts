// @vitest-environment node
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import { getSavedInvoiceIncome } from '@/lib/invoice/savedInvoiceIncome';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formData } from '../components/fixtures';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  decrypt: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: { invoice: { findFirst: mocks.findFirst, findMany: mocks.findMany } },
}));
vi.mock('@/lib/savedDataCrypto', () => ({ decryptJson: mocks.decrypt }));

const target = formData();
const createdAt = new Date('2026-03-02');
const current = {
  id: 'current',
  uid: 'm',
  invoiceNumber: '1/2026',
  createdAt,
  updatedAt: createdAt,
};
function saved(
  id: string,
  periodStart: string,
  date = createdAt,
  uid: string | null = null,
) {
  return {
    id,
    uid,
    periodStart,
    createdAt: date,
    data: formData({ periodStart }),
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.findFirst.mockResolvedValue(current);
  mocks.findMany.mockResolvedValue([]);
  mocks.decrypt.mockImplementation((data: unknown) => ({ data }));
});

describe('saved invoice income reader', () => {
  it('scopes reads to the owner, year and period and leaves new documents without current metadata', async () => {
    expect(
      await getSavedInvoiceIncome('owner', target, DEFAULT_TAX_PARAMS),
    ).toEqual({
      ok: true,
      data: { income: 0, current: null, latestSamePeriod: null },
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'owner',
        periodStart: { gte: '2026-01-01', lte: target.periodStart },
      },
      select: {
        id: true,
        uid: true,
        createdAt: true,
        periodStart: true,
        data: true,
      },
    });
  });

  it('uses current chronology, excludes newer same-period invoices and returns latest timestamp', async () => {
    const latest = new Date('2026-03-05');
    mocks.findMany.mockResolvedValue([
      saved('earlier-period', '2026-02-01'),
      saved('earlier-same-period', target.periodStart, new Date('2026-03-01')),
      saved('later-same-period', target.periodStart, latest),
    ]);
    const taxableBase = calculateInvoice(target, DEFAULT_TAX_PARAMS)
      .calculations.taxableBase;
    expect(
      await getSavedInvoiceIncome(
        'owner',
        target,
        DEFAULT_TAX_PARAMS,
        'current',
      ),
    ).toEqual({
      ok: true,
      data: { income: taxableBase * 2, current, latestSamePeriod: latest },
    });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'current', userId: 'owner' },
      select: {
        id: true,
        uid: true,
        invoiceNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(mocks.findMany.mock.lastCall?.[0].where.id).toEqual({
      not: 'current',
    });
  });

  it('rejects a missing or foreign invoice before reading history', async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect(
      await getSavedInvoiceIncome(
        'owner',
        target,
        DEFAULT_TAX_PARAMS,
        'foreign',
      ),
    ).toMatchObject({
      ok: false,
      invoiceChanged: true,
    });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it.each([
    {
      id: 'broken',
      uid: null,
      createdAt,
      periodStart: target.periodStart,
      data: {},
    },
    {
      ...saved('mismatch', target.periodStart),
      data: formData({ periodStart: '2026-01-01' }),
    },
  ])(
    'fails closed on unreadable or inconsistent history %#',
    async (record) => {
      mocks.findMany.mockResolvedValue([record]);
      expect(
        await getSavedInvoiceIncome('owner', target, DEFAULT_TAX_PARAMS),
      ).toEqual({
        ok: false,
        error: expect.stringContaining('Nie udało się odczytać'),
      });
    },
  );

  it('surfaces database and decryption errors instead of claiming zero income', async () => {
    const error = new Error('unavailable');
    mocks.findMany.mockRejectedValueOnce(error);
    await expect(
      getSavedInvoiceIncome('owner', target, DEFAULT_TAX_PARAMS),
    ).rejects.toThrow(error);
    mocks.findMany.mockResolvedValue([saved('encrypted', target.periodStart)]);
    mocks.decrypt.mockImplementation(() => {
      throw error;
    });
    await expect(
      getSavedInvoiceIncome('owner', target, DEFAULT_TAX_PARAMS),
    ).rejects.toThrow(error);
  });
});
