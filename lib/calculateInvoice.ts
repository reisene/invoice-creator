import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { TaxParams } from '@/types/taxParams';

const round2 = (value: number): number =>
  Math.round((value + 1e-9) * 100) / 100;

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

  // 2. Składki społeczne (obowiązkowe tylko dla statusu standard; zwolnieni: uczeń/student do 26 lat oraz zbieg z etatem z min. wynagrodzeniem)
  const hasSocialContributions = data.contractorStatus === 'standard';

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

  // 3. Podstawa składki zdrowotnej (uczniowie i studenci do 26 lat zwolnieni na podstawie art. 66 ust. 1 pkt 1 lit. e ustawy o świadczeniach opieki zdrowotnej)
  const hasHealthContribution = data.contractorStatus !== 'student_under_26';
  const healthContributionBase = hasHealthContribution
    ? round2(gross - totalSocialContributions)
    : 0;

  // 4. Składka zdrowotna (9% z ograniczeniem do zaliczki na podatek wg zasad z 31.12.2021 r., art. 83 ust. 1 i 2b ustawy o świadczeniach opieki zdrowotnej)
  let healthContribution = 0;
  if (hasHealthContribution && healthContributionBase > 0) {
    const rawHealthContribution = round2(healthContributionBase * P.healthRate);

    // Hipotetyczna zaliczka na podatek wg stanu na 31.12.2021 r. (stawka 17%, z uwzględnieniem przychodów z ulgi dla młodych)
    const hypotheticalCostRate =
      data.costType === '50' ? P.costRateArtistic : P.costRateStandard;
    const hypotheticalCosts = round2(
      healthContributionBase * hypotheticalCostRate,
    );
    const hypotheticalTaxBase = Math.max(
      0,
      Math.round(healthContributionBase - hypotheticalCosts),
    );
    const hypotheticalTax2021 = round2(hypotheticalTaxBase * 0.17);

    healthContribution = Math.min(rawHealthContribution, hypotheticalTax2021);
  }

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

  // 6. Koszty uzyskania przychodu (20% lub 50% z limitem rocznym 120 000 zł, art. 22 ust. 9 i 9a ustawy o PIT)
  const costRate =
    data.costType === '50' ? P.costRateArtistic : P.costRateStandard;
  const rawTaxDeductibleCosts = round2(taxableIncomeBeforeCosts * costRate);
  const taxDeductibleCosts =
    data.costType === '50'
      ? Math.min(rawTaxDeductibleCosts, P.taxThreshold)
      : rawTaxDeductibleCosts;

  // 7. Podstawa opodatkowania (zaokrąglona do pełnych zł, art. 63 § 1 Ordynacji podatkowej)
  const taxableBaseUnrounded = round2(
    taxableIncomeBeforeCosts - taxDeductibleCosts,
  );
  const taxableBase = Math.max(0, Math.round(taxableBaseUnrounded));

  // 8. PIT wg skali podatkowej
  const taxableIncomeAfterInvoice = data.yearToDateTaxableIncome + taxableBase;
  const incomeAtFirstRate = Math.max(
    0,
    Math.min(taxableIncomeAfterInvoice, P.taxThreshold) -
      Math.min(data.yearToDateTaxableIncome, P.taxThreshold),
  );
  const incomeAtSecondRate = Math.max(0, taxableBase - incomeAtFirstRate);
  const taxBeforeReduction = round2(
    incomeAtFirstRate * P.taxRate1 + incomeAtSecondRate * P.taxRate2,
  );

  // 9. Kwota zmniejszająca podatek (PIT-2, maksymalnie miesięczny limit z parametrów)
  const taxReductionAmountApplied = data.taxReduction
    ? Math.min(data.taxReductionAmount, P.monthlyTaxReduction)
    : 0;

  // 10. Zaliczka na PIT po kwocie zmniejszającej podatek, zaokrąglona do pełnych zł (art. 63 § 1 Ordynacji podatkowej)
  const tax =
    taxableBase <= 0
      ? 0
      : Math.max(0, Math.round(taxBeforeReduction - taxReductionAmountApplied));

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
    issuePlace: data.issuePlace,
    issueDate: data.issueDate,
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
