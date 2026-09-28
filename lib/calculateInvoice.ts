import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';

// Stałe (2026 – możesz potem zaktualizować)
const PENSION_RATE = 0.0976; // 9,76%
const RENT_RATE = 0.015; // 1,5%
const SICKNESS_RATE = 0.0245; // 2,45%
const HEALTH_RATE = 0.09; // 9%

const TAX_RATE_1 = 0.12; // 12% do progu
const TAX_RATE_2 = 0.32; // 32% powyżej progu
const TAX_THRESHOLD = 120_000; // roczny próg podatkowy

const MONTHLY_TAX_REDUCTION = 300; // miesięczna ulga podatkowa
const YEARLY_YOUNG_RELIEF_LIMIT = 85_528; // limit ulgi dla młodych (roczny)

export function calculateInvoice(
  data: InvoiceFormData,
  yearToDateIncome: number = 0,
): InvoiceData {
  // 1. Brutto
  const gross =
    data.contractType === 'monthly'
      ? (data.grossAmount ?? 0)
      : (data.hourlyRate ?? 0) * (data.hoursWorked ?? 0);

  // 2. Składki społeczne
  const hasSocialContributions =
    data.contractorStatus === 'standard' ||
    data.contractorStatus === 'with_employment';

  const pensionContribution = hasSocialContributions ? gross * PENSION_RATE : 0;

  const rentContribution = hasSocialContributions ? gross * RENT_RATE : 0;

  const sicknessContribution =
    hasSocialContributions && data.voluntarySickness
      ? gross * SICKNESS_RATE
      : 0;

  const totalSocialContributions =
    pensionContribution + rentContribution + sicknessContribution;

  // 3. Podstawa składki zdrowotnej
  const healthContributionBase = gross - totalSocialContributions;

  // 4. Składka zdrowotna (9%)
  const healthContribution = healthContributionBase * HEALTH_RATE;

  // 5. Koszty uzyskania przychodu
  const costRate = data.costType === '50' ? 0.5 : 0.2;
  const taxDeductibleCosts = healthContributionBase * costRate;

  // 6. Podstawa opodatkowania
  const taxableBaseUnrounded = healthContributionBase - taxDeductibleCosts;
  const taxableBase = Math.round(taxableBaseUnrounded);

  // 7. Zaliczka na PIT (12% do progu, 32% powyżej)
  const projectedYearlyIncome = yearToDateIncome + gross;
  const taxRate =
    projectedYearlyIncome <= TAX_THRESHOLD ? TAX_RATE_1 : TAX_RATE_2;

  const taxBeforeReduction = Math.round(taxableBase * taxRate);

  // 8. Ulga podatkowa (300 zł miesięcznie, proporcjonalnie)
  const taxReductionAmountApplied = data.taxReduction
    ? MONTHLY_TAX_REDUCTION
    : 0;

  // 9. Zaliczka na PIT po uldze
  const taxBeforeYoungRelief = Math.max(
    0,
    taxBeforeReduction - taxReductionAmountApplied,
  );

  // 10. Ulga dla młodych (do 26 r.ż.)
  const isEligibleForYoungRelief =
    data.youngRelief &&
    data.contractorStatus === 'standard' &&
    !data.voluntarySickness; // uproszczenie

  let youngReliefApplied = 0;
  if (isEligibleForYoungRelief) {
    const remainingLimit = Math.max(
      0,
      YEARLY_YOUNG_RELIEF_LIMIT - yearToDateIncome,
    );
    youngReliefApplied = Math.min(taxBeforeYoungRelief, remainingLimit);
  }

  const tax = Math.max(0, taxBeforeYoungRelief - youngReliefApplied);

  // 11. Netto
  const net = gross - totalSocialContributions - healthContribution - tax;

  return {
    client: {
      type: data.clientType,
      name: data.clientName,
      address: data.clientAddress,
      nip: data.clientNip,
      pesel: data.clientPesel,
    },
    contractor: {
      name: data.contractorName,
      address: data.contractorAddress,
      pesel: data.contractorPesel,
      nip: data.contractorNip,
    },
    contract: {
      number: data.contractNumber,
      date: data.contractDate,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      type: data.contractType,
    },
    remuneration: {
      gross,
      hourlyRate: data.hourlyRate,
      hoursWorked: data.hoursWorked,
    },
    contractorStatus: data.contractorStatus,
    voluntarySickness: data.voluntarySickness,
    costType: data.costType,
    youngRelief: data.youngRelief,
    taxReduction: data.taxReduction,
    taxReductionAmount: data.taxReductionAmount,
    calculations: {
      gross,
      pensionContribution,
      rentContribution,
      sicknessContribution,
      totalSocialContributions,
      healthContributionBase,
      healthContribution,
      taxDeductibleCosts,
      taxableBaseUnrounded,
      taxableBase,
      taxBeforeReduction,
      taxReductionAmountApplied,
      tax,
      net,
    },
    notes: data.notes,
  };
}
