import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { TaxParams } from '@/types/taxParams';

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateInvoice(
  data: InvoiceFormData,
  P: TaxParams,
): InvoiceData {
  // 1. Brutto
  const gross = round2(
    data.contractType === 'monthly'
      ? (data.grossAmount ?? 0)
      : (data.hourlyRate ?? 0) * (data.hoursWorked ?? 0),
  );

  // 2. Składki społeczne
  const hasSocialContributions =
    data.contractorStatus === 'standard' ||
    data.contractorStatus === 'with_employment';

  const pensionContribution = hasSocialContributions
    ? round2(gross * P.pensionRate)
    : 0;

  const rentContribution = hasSocialContributions
    ? round2(gross * P.rentRate)
    : 0;

  const sicknessContribution =
    hasSocialContributions && data.voluntarySickness
      ? round2(gross * P.sicknessRate)
      : 0;

  const totalSocialContributions = round2(
    pensionContribution + rentContribution + sicknessContribution,
  );

  // 3. Podstawa składki zdrowotnej
  const healthContributionBase = round2(gross - totalSocialContributions);

  // 4. Składka zdrowotna (9%)
  const healthContribution = round2(healthContributionBase * P.healthRate);

  // 5. Apply the annual young-relief exemption to qualifying gross revenue.
  const remainingYoungReliefLimit = Math.max(
    0,
    P.yearlyYoungReliefLimit - data.yearToDateYoungReliefIncome,
  );
  const youngReliefIncomeApplied = data.youngRelief
    ? Math.min(gross, remainingYoungReliefLimit)
    : 0;
  const taxableGross = round2(gross - youngReliefIncomeApplied);
  const taxableSocialContributions =
    gross > 0 ? round2(totalSocialContributions * (taxableGross / gross)) : 0;
  const taxableIncomeBeforeCosts = Math.max(
    0,
    round2(taxableGross - taxableSocialContributions),
  );

  // 6. Koszty uzyskania przychodu
  const costRate =
    data.costType === '50' ? P.costRateArtistic : P.costRateStandard;
  const taxDeductibleCosts = round2(taxableIncomeBeforeCosts * costRate);

  // 7. Podstawa opodatkowania
  const taxableBaseUnrounded = round2(
    taxableIncomeBeforeCosts - taxDeductibleCosts,
  );
  const taxableBase = Math.round(taxableBaseUnrounded);

  // 8. PIT using the marginal rate for the part crossing the annual threshold.
  const taxableIncomeAfterInvoice = data.yearToDateTaxableIncome + taxableBase;
  const incomeAtFirstRate = Math.max(
    0,
    Math.min(taxableIncomeAfterInvoice, P.taxThreshold) -
      Math.min(data.yearToDateTaxableIncome, P.taxThreshold),
  );
  const incomeAtSecondRate = Math.max(0, taxableBase - incomeAtFirstRate);
  const taxBeforeReduction = Math.round(
    incomeAtFirstRate * P.taxRate1 + incomeAtSecondRate * P.taxRate2,
  );

  // 9. Ulga podatkowa (300 zł miesięcznie, proporcjonalnie)
  const taxReductionAmountApplied = data.taxReduction
    ? Math.min(data.taxReductionAmount, P.monthlyTaxReduction)
    : 0;

  // 10. Zaliczka na PIT po kwocie zmniejszającej podatek.
  const tax = Math.max(0, taxBeforeReduction - taxReductionAmountApplied);

  // 11. Netto
  const net = round2(
    gross - totalSocialContributions - healthContribution - tax,
  );

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
    payment: {
      method: data.paymentMethod,
      transferTarget: data.transferTarget,
      accountHolder: data.bankAccountHolder,
      bankName: data.bankName,
      accountNumber: data.bankAccountNumber,
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
      youngReliefIncomeApplied,
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
