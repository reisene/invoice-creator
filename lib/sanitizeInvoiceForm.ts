import type { InvoiceFormData } from '@/types/invoiceForm';

const oneOf = <T extends string | number>(
  value: unknown,
  allowed: readonly T[],
): T | null => (allowed.includes(value as T) ? (value as T) : null);

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.length <= max ? value : null;

const optionalText = (
  value: unknown,
  max: number,
): string | undefined | null =>
  value === undefined || value === null || value === ''
    ? undefined
    : text(value, max);

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e9
    ? value
    : null;

const optionalNum = (value: unknown): number | undefined | null =>
  value === undefined || value === null ? undefined : num(value);

/** Builds a trusted InvoiceFormData from untrusted input, or returns null. */
export function sanitizeInvoiceForm(input: unknown): InvoiceFormData | null {
  if (typeof input !== 'object' || input === null) return null;
  const v = input as Record<string, unknown>;

  const clientType = oneOf(v.clientType, ['company', 'private'] as const);
  const contractType = oneOf(v.contractType, ['monthly', 'hourly'] as const);
  const contractorStatus = oneOf(v.contractorStatus, [
    'standard',
    'student_under_26',
    'with_employment',
  ] as const);
  const costType = oneOf(v.costType, ['20', '50'] as const);
  const taxReductionAmount = oneOf(v.taxReductionAmount, [
    0, 100, 150, 300,
  ] as const);
  const paymentMethod =
    v.paymentMethod === undefined
      ? ''
      : oneOf(v.paymentMethod, ['CASH', 'TRANSFER', ''] as const);
  const transferTarget =
    v.transferTarget === undefined
      ? ''
      : oneOf(v.transferTarget, ['SAVED_ACCOUNT', 'DECLARATION', ''] as const);

  const clientName = text(v.clientName, 200);
  const clientAddress = text(v.clientAddress, 300);
  const clientNip = optionalText(v.clientNip, 20);
  const clientPesel = optionalText(v.clientPesel, 20);
  const contractorName = text(v.contractorName, 200);
  const contractorAddress = text(v.contractorAddress, 300);
  const contractorPesel = text(v.contractorPesel, 20);
  const contractorNip = optionalText(v.contractorNip, 20);
  const contractNumber = optionalText(v.contractNumber, 100);
  const contractDate = text(v.contractDate, 10);
  const periodStart = text(v.periodStart, 10);
  const periodEnd = text(v.periodEnd, 10);
  const grossAmount = optionalNum(v.grossAmount);
  const hourlyRate = optionalNum(v.hourlyRate);
  const hoursWorked = optionalNum(v.hoursWorked);
  const yearToDateTaxableIncome = num(v.yearToDateTaxableIncome);
  const yearToDateYoungReliefIncome = num(v.yearToDateYoungReliefIncome);
  const notes = optionalText(v.notes, 2000);
  const bankAccountHolder = optionalText(v.bankAccountHolder, 200);
  const bankName = optionalText(v.bankName, 100);
  const bankAccountNumber = optionalText(v.bankAccountNumber, 34);

  if (
    !clientType ||
    !contractType ||
    !contractorStatus ||
    !costType ||
    taxReductionAmount === null ||
    paymentMethod === null ||
    transferTarget === null ||
    clientName === null ||
    clientAddress === null ||
    clientNip === null ||
    clientPesel === null ||
    contractorName === null ||
    contractorAddress === null ||
    contractorPesel === null ||
    contractorNip === null ||
    contractNumber === null ||
    contractDate === null ||
    periodStart === null ||
    periodEnd === null ||
    grossAmount === null ||
    hourlyRate === null ||
    hoursWorked === null ||
    yearToDateTaxableIncome === null ||
    yearToDateYoungReliefIncome === null ||
    notes === null ||
    bankAccountHolder === null ||
    bankName === null ||
    bankAccountNumber === null ||
    typeof v.voluntarySickness !== 'boolean' ||
    typeof v.youngRelief !== 'boolean' ||
    typeof v.taxReduction !== 'boolean'
  ) {
    return null;
  }

  return {
    clientType,
    clientName,
    clientAddress,
    clientNip,
    clientPesel,
    contractorName,
    contractorAddress,
    contractorPesel,
    contractorNip,
    contractNumber,
    contractDate,
    periodStart,
    periodEnd,
    contractType,
    grossAmount,
    hourlyRate,
    hoursWorked,
    contractorStatus,
    voluntarySickness: v.voluntarySickness,
    costType,
    youngRelief: v.youngRelief,
    yearToDateTaxableIncome,
    yearToDateYoungReliefIncome,
    taxReduction: v.taxReduction,
    taxReductionAmount,
    paymentMethod,
    transferTarget,
    bankAccountHolder,
    bankName,
    bankAccountNumber,
    notes,
  };
}
