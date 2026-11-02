// @vitest-environment node
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import {
  getPreviousInvoiceTaxableIncome,
  normalizeContractorPesel,
  type InvoiceIncomeEntry,
} from '@/lib/invoice/invoiceIncome';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { describe, expect, it } from 'vitest';
import { formData } from '../components/fixtures';

const params = DEFAULT_TAX_PARAMS;
const target = {
  id: 'target',
  periodStart: '2026-03-01',
  contractorPesel: formData().contractorPesel,
};
function entry(
  id: string,
  overrides: Partial<InvoiceIncomeEntry> = {},
): InvoiceIncomeEntry {
  return {
    id,
    uid: null,
    createdAt: new Date('2026-03-01'),
    form: formData(),
    ...overrides,
  };
}
const taxableBase = calculateInvoice(
  { ...formData(), yearToDateTaxableIncome: 0, taxReduction: false },
  params,
).calculations.taxableBase;

describe('previous invoice income', () => {
  it('normalizes PESEL separators', () => {
    expect(normalizeContractorPesel(' 900-101 12349 ')).toBe('90010112349');
  });

  it('excludes the current invoice, later periods, other years and people', () => {
    const records = [
      entry('target'),
      entry('earlier', { form: formData({ periodStart: '2026-02-01' }) }),
      entry('same-period'),
      entry('later', { form: formData({ periodStart: '2026-04-01' }) }),
      entry('old-year', { form: formData({ periodStart: '2025-01-01' }) }),
      entry('other-person', {
        form: formData({ contractorPesel: '44051401458' }),
      }),
    ];
    expect(getPreviousInvoiceTaxableIncome(records, target, params)).toBe(
      taxableBase * 2,
    );
    expect(getPreviousInvoiceTaxableIncome([], target, params)).toBe(0);
  });

  it('orders same-period records by creation time, then UID or legacy id', () => {
    const createdAt = new Date('2026-03-10');
    const records = [
      entry('earlier', { createdAt: new Date('2026-03-09') }),
      entry('later', { createdAt: new Date('2026-03-11') }),
      entry('uid-before', { uid: 'a', createdAt }),
      entry('uid-after', { uid: 'z', createdAt }),
      entry('a', { createdAt }),
      entry('z', { createdAt }),
    ];
    expect(
      getPreviousInvoiceTaxableIncome(
        records,
        { ...target, uid: 'm', createdAt },
        params,
      ),
    ).toBe(taxableBase * 3);
    expect(
      getPreviousInvoiceTaxableIncome(
        [entry('a', { createdAt }), entry('z', { createdAt })],
        { ...target, id: 'm', createdAt },
        params,
      ),
    ).toBe(taxableBase);
  });

  it('uses only each invoice taxable base, not its manual annual incomes or reliefs', () => {
    const records = [
      entry('prior', {
        form: formData({
          contractorPesel: '900-101 12349',
          yearToDateTaxableIncome: 900000,
          yearToDateEmploymentIncome: 900000,
          noTaxAdvanceRequest: true,
          taxReduction: true,
        }),
      }),
    ];
    expect(getPreviousInvoiceTaxableIncome(records, target, params)).toBe(
      taxableBase,
    );
  });

  it('changes net by exactly 8000 when prior invoices move the full 40000 base above the threshold', () => {
    const current = formData({
      grossAmount: 50000,
      contractorStatus: 'student_under_26',
      youngRelief: false,
      voluntarySickness: false,
      taxReduction: false,
      noTaxAdvanceRequest: false,
    });
    const prior = entry('prior', {
      form: { ...current, grossAmount: 150000, periodStart: '2026-02-01' },
    });
    const income = getPreviousInvoiceTaxableIncome([prior], target, params);
    expect(income).toBe(120000);
    const withoutHistory = calculateInvoice(current, params).calculations.net;
    const withHistory = calculateInvoice(
      { ...current, yearToDateTaxableIncome: income },
      params,
    ).calculations.net;
    expect(withoutHistory - withHistory).toBe(8000);
  });
});
