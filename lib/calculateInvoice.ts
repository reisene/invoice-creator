import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { TaxParams } from '@/types/taxParams';

export function calculateInvoice(
  data: InvoiceFormData,
  P: TaxParams,
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

  const pensionContribution = hasSocialContributions
    ? gross * P.pensionRate
    : 0;

  const rentContribution = hasSocialContributions ? gross * P.rentRate : 0;

  const sicknessContribution =
    hasSocialContributions && data.voluntarySickness
      ? gross * P.sicknessRate
      : 0;

  const totalSocialContributions =
    pensionContribution + rentContribution + sicknessContribution;

  // 3. Podstawa składki zdrowotnej
  const healthContributionBase = gross - totalSocialContributions;

  // 4. Składka zdrowotna (9%)
  const healthContribution = healthContributionBase * P.healthRate;

  // 5. Koszty uzyskania przychodu
  const costRate =
    data.costType === '50' ? P.costRateArtistic : P.costRateStandard;
  const taxDeductibleCosts = healthContributionBase * costRate;

  // 6. Podstawa opodatkowania
  const taxableBaseUnrounded = healthContributionBase - taxDeductibleCosts;
  const taxableBase = Math.round(taxableBaseUnrounded);

  // 7. Zaliczka na PIT (12% do progu, 32% powyżej)
  const projectedYearlyIncome = yearToDateIncome + gross;
  const taxRate =
    projectedYearlyIncome <= P.taxThreshold ? P.taxRate1 : P.taxRate2;

  const taxBeforeReduction = Math.round(taxableBase * taxRate);

  // 8. Ulga podatkowa (300 zł miesięcznie, proporcjonalnie)
  const taxReductionAmountApplied = data.taxReduction
    ? Math.min(data.taxReductionAmount, P.monthlyTaxReduction)
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
      P.yearlyYoungReliefLimit - yearToDateIncome,
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
