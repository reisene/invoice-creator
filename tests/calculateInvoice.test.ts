import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { TaxParams } from '@/types/taxParams';
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

const testTaxParams: TaxParams = {
  year: 2026,
  pensionRate: 0.0976,
  rentRate: 0.015,
  sicknessRate: 0.0245,
  healthRate: 0.09,
  taxRate1: 0.12,
  taxRate2: 0.32,
  taxThreshold: 120000,
  monthlyTaxReduction: 300,
  yearlyYoungReliefLimit: 85528,
  zusLimitMultiple: 30,
  minimumWage: 4806,
  costRateStandard: 0.2,
  costRateArtistic: 0.5,
};

function createBaseForm(
  overrides: Partial<InvoiceFormData> = {},
): InvoiceFormData {
  return {
    clientType: 'company',
    clientName: 'Firma XYZ Sp. z o.o.',
    clientAddress: 'ul. Prosta 1, 00-001 Warszawa',
    clientNip: '5252525252',
    contractorName: 'Jan Kowalski',
    contractorAddress: 'ul. Polna 2, 00-002 Warszawa',
    contractorPesel: '90010112345',
    contractDate: '2026-03-01',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    contractType: 'monthly',
    grossAmount: 5000,
    contractorStatus: 'standard',
    voluntarySickness: false,
    costType: '20',
    youngRelief: false,
    yearToDateTaxableIncome: 0,
    yearToDateYoungReliefIncome: 0,
    taxReduction: true,
    taxReductionAmount: 300,
    paymentMethod: 'TRANSFER',
    transferTarget: 'DECLARATION',
    ...overrides,
  };
}

describe('calculateInvoice - Weryfikacja reguł podatkowych i ZUS', () => {
  it('standardowe zlecenie: pełne składki społeczne, zdrowotna 9%, KUP 20% i ulga PIT-2 (300 zł)', () => {
    const form = createBaseForm({
      grossAmount: 5000,
      voluntarySickness: false,
    });
    const result = calculateInvoice(form, testTaxParams);
    const { calculations } = result;

    // Gross: 5000.00 zł
    assert.equal(calculations.gross, 5000);

    // Emerytalna (9.76%): 488.00 zł
    assert.equal(calculations.pensionContribution, 488);
    // Rentowa (1.5%): 75.00 zł
    assert.equal(calculations.rentContribution, 75);
    // Chorobowa: 0 zł (brak dobrowolnej)
    assert.equal(calculations.sicknessContribution, 0);
    // Razem ZUS społeczne: 563.00 zł
    assert.equal(calculations.totalSocialContributions, 563);

    // Podstawa zdrowotnej: 5000 - 563 = 4437.00 zł
    assert.equal(calculations.healthContributionBase, 4437);
    // Zdrowotna: 4437 * 9% = 399.33 zł
    assert.equal(calculations.healthContribution, 399.33);

    // KUP 20% z 4437: 887.40 zł
    assert.equal(calculations.taxDeductibleCosts, 887.4);

    // Dochód do opodatkowania: 4437 - 887.40 = 3549.60 zł -> zaokrąglenie do 3550 zł
    assert.equal(calculations.taxableBase, 3550);

    // PIT przed ulgą: 3550 * 12% = 426.00 zł
    assert.equal(calculations.taxBeforeReduction, 426);

    // Zaliczka PIT: 426 - 300 = 126 zł
    assert.equal(calculations.tax, 126);

    // Netto: 5000 - 563 - 399.33 - 126 = 3911.67 zł
    assert.equal(calculations.net, 3911.67);
  });

  it('student do 26 lat z ulgą dla młodych: brutto = netto (0 ZUS, 0 NFZ, 0 PIT)', () => {
    const form = createBaseForm({
      grossAmount: 4000,
      contractorStatus: 'student_under_26',
      youngRelief: true,
      voluntarySickness: true, // powinno być zignorowane
    });
    const result = calculateInvoice(form, testTaxParams);
    const { calculations } = result;

    assert.equal(calculations.pensionContribution, 0);
    assert.equal(calculations.rentContribution, 0);
    assert.equal(calculations.sicknessContribution, 0);
    assert.equal(calculations.totalSocialContributions, 0);
    assert.equal(calculations.healthContributionBase, 0);
    assert.equal(calculations.healthContribution, 0);
    assert.equal(calculations.tax, 0);
    assert.equal(calculations.net, 4000);
  });

  it('zbieg z etatem: brak składek społecznych ZUS, wyłącznie zdrowotna 9% i PIT', () => {
    const form = createBaseForm({
      grossAmount: 3000,
      contractorStatus: 'with_employment',
      voluntarySickness: true, // powinno być zignorowane
      taxReduction: true,
      taxReductionAmount: 300,
    });
    const result = calculateInvoice(form, testTaxParams);
    const { calculations } = result;

    // Składki społeczne: 0
    assert.equal(calculations.totalSocialContributions, 0);
    assert.equal(calculations.pensionContribution, 0);
    assert.equal(calculations.rentContribution, 0);
    assert.equal(calculations.sicknessContribution, 0);

    // Podstawa zdrowotnej = cały przychód 3000 zł
    assert.equal(calculations.healthContributionBase, 3000);
    // Składka zdrowotna 9% = 270 zł
    assert.equal(calculations.healthContribution, 270);

    // KUP 20% z 3000 zł = 600 zł
    assert.equal(calculations.taxDeductibleCosts, 600);

    // Podstawa PIT = 3000 - 600 = 2400 zł
    assert.equal(calculations.taxableBase, 2400);

    // PIT 12% z 2400 zł = 288 zł; minus ulga 300 zł -> 0 zł
    assert.equal(calculations.taxBeforeReduction, 288);
    assert.equal(calculations.tax, 0);

    // Netto: 3000 - 270 = 2730 zł
    assert.equal(calculations.net, 2730);
  });

  it('50% KUP (prawa autorskie) i ograniczenie składki zdrowotnej do wysokości zaliczki (art. 83 ust. 1 i 2b ustawy zdrowotnej)', () => {
    const form = createBaseForm({
      grossAmount: 2000,
      contractorStatus: 'with_employment',
      costType: '50',
      taxReduction: false,
    });
    const result = calculateInvoice(form, testTaxParams);
    const { calculations } = result;

    // Podstawa zdrowotnej = 2000 zł
    // Zwykła składka 9% = 180 zł
    // Hipotetyczna zaliczka na 31.12.2021 r.:
    // KUP 50% = 1000 zł, podstawa = 1000 zł
    // Hipotetyczny PIT 17% z 1000 zł = 170 zł
    // Ponieważ 180 zł > 170 zł, składka zdrowotna zostaje obniżona do 170 zł!
    assert.equal(calculations.healthContribution, 170);

    // Rzeczywisty PIT: 1000 zł * 12% = 120 zł
    assert.equal(calculations.tax, 120);

    // Netto: 2000 - 170 - 120 = 1710 zł
    assert.equal(calculations.net, 1710);
  });

  it('przekroczenie progu podatkowego 120 000 zł: marginalna stawka 32%', () => {
    const form = createBaseForm({
      grossAmount: 10000,
      contractorStatus: 'with_employment',
      costType: '20',
      yearToDateTaxableIncome: 118000, // 2000 zł brakuje do progu
      taxReduction: false,
    });
    const result = calculateInvoice(form, testTaxParams);
    const { calculations } = result;

    // Podstawa PIT = 10000 - 2000 = 8000 zł
    assert.equal(calculations.taxableBase, 8000);
    // 2000 zł opodatkowane 12% = 240 zł
    // 6000 zł opodatkowane 32% = 1920 zł
    // Razem PIT = 2160 zł
    assert.equal(calculations.taxBeforeReduction, 2160);
    assert.equal(calculations.tax, 2160);
  });

  it('stawka godzinowa i ułamkowa liczba godzin (np. 32.73 zł/h i 185.5 h)', () => {
    const form = createBaseForm({
      contractType: 'hourly',
      hourlyRate: 32.73,
      hoursWorked: 185.5,
      contractorStatus: 'student_under_26',
      youngRelief: true,
    });
    const result = calculateInvoice(form, testTaxParams);
    // 32.73 * 185.5 = 6071.415 -> zaokrąglenie do 6071.42 zł
    assert.equal(result.remuneration.gross, 6071.42);
    assert.equal(result.calculations.gross, 6071.42);
    // Student pod 26 lat: brutto = netto
    assert.equal(result.calculations.net, 6071.42);
  });
});
