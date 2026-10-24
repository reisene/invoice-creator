// @vitest-environment node
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import { DEFAULT_TAX_PARAMS as params } from '@/lib/invoice/taxConstants';
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { describe, expect, it } from 'vitest';

const base: InvoiceFormData = {
  ...SAMPLE_INVOICE_PRESETS[0].formData,
  contractorStatus: 'with_employment',
  voluntarySickness: false,
  taxReduction: false,
  grossAmount: 10000,
};
describe('invoice calculation limits and output', () => {
  it('copies party, contract, payment and document fields without losing optional values', () => {
    const input = {
      ...base,
      clientPesel: '123',
      contractorNip: '456',
      contractNumber: 'Z/26',
    };
    const result = calculateInvoice(input, params);
    expect(result).toMatchObject({
      client: {
        type: input.clientType,
        name: input.clientName,
        address: input.clientAddress,
        nip: input.clientNip,
        pesel: '123',
      },
      contractor: {
        name: input.contractorName,
        address: input.contractorAddress,
        pesel: input.contractorPesel,
        nip: '456',
      },
      contract: {
        number: 'Z/26',
        date: input.contractDate,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        type: 'monthly',
      },
      issuePlace: input.issuePlace,
      issueDate: input.issueDate,
      payment: {
        method: input.paymentMethod,
        transferTarget: input.transferTarget,
        accountHolder: input.bankAccountHolder,
        bankName: input.bankName,
        accountNumber: input.bankAccountNumber,
      },
      notes: input.notes,
    });
  });
  it.each([
    { grossAmount: undefined },
    { contractType: 'hourly' as const, hourlyRate: undefined, hoursWorked: 2 },
    { contractType: 'hourly' as const, hourlyRate: 20, hoursWorked: undefined },
  ])('defaults missing amounts to zero: %j', (overrides) => {
    const result = calculateInvoice(
      { ...base, ...overrides, noTaxAdvanceRequest: undefined },
      params,
    );
    expect(result.calculations).toMatchObject({
      gross: 0,
      totalSocialContributions: 0,
      healthContribution: 0,
      tax: 0,
      net: 0,
    });
    expect(result.noTaxAdvanceRequest).toBe(false);
  });
  it('applies young relief only to the remaining gross allowance and prorates social deductions', () => {
    const result = calculateInvoice(
      {
        ...base,
        contractorStatus: 'standard',
        voluntarySickness: true,
        youngRelief: true,
        yearToDateYoungReliefIncome: params.yearlyYoungReliefLimit - 1000,
      },
      params,
    ).calculations;
    expect(result).toMatchObject({
      gross: 10000,
      pensionContribution: 976,
      rentContribution: 150,
      sicknessContribution: 245,
      totalSocialContributions: 1371,
      youngReliefIncomeApplied: 1000,
      taxDeductibleCosts: 1553.22,
      taxableBase: 6213,
      tax: 746,
      net: 7106.39,
    });
  });
  it('does not apply exhausted relief or more than the annual artistic-cost cap', () => {
    const exhausted = calculateInvoice(
      {
        ...base,
        youngRelief: true,
        yearToDateYoungReliefIncome: params.yearlyYoungReliefLimit + 1,
      },
      params,
    );
    expect(exhausted.calculations.youngReliefIncomeApplied).toBe(0);
    const capped = calculateInvoice(
      { ...base, costType: '50', grossAmount: 300000 },
      params,
    );
    expect(capped.calculations.taxDeductibleCosts).toBe(120000);
    expect(capped.calculations.taxableBase).toBe(180000);
    expect(capped.calculations.tax).toBe(33600);
  });
  it.each([
    [0, 0, 0],
    [29000, 7000, 840],
    [30000, 8000, 960],
    [118000, 8000, 2160],
    [121000, 8000, 2560],
  ])(
    'taxes only income above the free allowance with year-to-date %s',
    (yearToDate, taxableAbove, tax) => {
      const result = calculateInvoice(
        {
          ...base,
          noTaxAdvanceRequest: true,
          taxReduction: true,
          taxReductionAmount: 300,
          yearToDateTaxableIncome: yearToDate,
        },
        params,
      ).calculations;
      expect(result.taxableIncomeAboveTaxFreeAmount).toBe(taxableAbove);
      expect(result.taxReductionAmountApplied).toBe(0);
      expect(result.tax).toBe(tax);
    },
  );
  it('includes employment income only for the employment status', () => {
    const employed = calculateInvoice(
      { ...base, yearToDateEmploymentIncome: 120000 },
      params,
    );
    expect(employed.calculations.tax).toBe(2560);
    const standard = calculateInvoice(
      {
        ...base,
        contractorStatus: 'standard',
        yearToDateEmploymentIncome: 120000,
      },
      params,
    );
    expect(standard.calculations.taxBeforeReduction).toBe(851.88);
    expect(standard.calculations.tax).toBe(852);
  });
  it('caps the PIT-2 reduction at the configured monthly maximum', () => {
    const result = calculateInvoice(
      { ...base, taxReduction: true, taxReductionAmount: 300 },
      { ...params, monthlyTaxReduction: 100 },
    );
    expect(result.calculations.taxReductionAmountApplied).toBe(100);
    expect(result.calculations.tax).toBe(860);
  });
});
