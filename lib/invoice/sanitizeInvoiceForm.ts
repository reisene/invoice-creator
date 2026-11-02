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

const num = (value: unknown, limit: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < limit
    ? value
    : null;

const optionalNum = (
  value: unknown,
  limit: number,
): number | undefined | null =>
  value === undefined || value === null ? undefined : num(value, limit);

/** Builds a trusted InvoiceFormData from untrusted input, or returns null. */
export function sanitizeInvoiceForm(
  input: unknown,
  options: { draft?: boolean } = {},
): InvoiceFormData | null {
  if (typeof input !== 'object' || input === null) return null;
  const v = input as Record<string, unknown>;
  const maxLength = (limit: number) => (options.draft ? Infinity : limit);
  const numberLimit = options.draft ? Infinity : 1e9;

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
  const noTaxAdvanceRequest =
    v.noTaxAdvanceRequest === undefined ? false : v.noTaxAdvanceRequest;
  const paymentMethod =
    v.paymentMethod === undefined
      ? ''
      : oneOf(v.paymentMethod, ['CASH', 'TRANSFER', ''] as const);
  const transferTarget =
    v.transferTarget === undefined
      ? ''
      : oneOf(v.transferTarget, ['SAVED_ACCOUNT', 'DECLARATION', ''] as const);

  const clientName = text(v.clientName, maxLength(200));
  const clientAddress = text(v.clientAddress, maxLength(300));
  const clientNip = optionalText(v.clientNip, maxLength(20));
  const clientPesel = optionalText(v.clientPesel, maxLength(20));
  const contractorName = text(v.contractorName, maxLength(200));
  const contractorAddress = text(v.contractorAddress, maxLength(300));
  const contractorPesel = text(v.contractorPesel, maxLength(20));
  const contractorNip = optionalText(v.contractorNip, maxLength(20));
  const contractNumber = optionalText(v.contractNumber, maxLength(100));
  const contractDate = text(v.contractDate, maxLength(10));
  const issuePlace = optionalText(v.issuePlace, maxLength(100));
  const issueDate = optionalText(v.issueDate, maxLength(10));
  const periodStart = text(v.periodStart, maxLength(10));
  const periodEnd = text(v.periodEnd, maxLength(10));
  const grossAmount = optionalNum(v.grossAmount, numberLimit);
  const hourlyRate = optionalNum(v.hourlyRate, numberLimit);
  const hoursWorked = optionalNum(v.hoursWorked, numberLimit);
  const yearToDateTaxableIncome = num(v.yearToDateTaxableIncome, numberLimit);
  const yearToDateEmploymentIncome =
    v.yearToDateEmploymentIncome === undefined
      ? 0
      : num(v.yearToDateEmploymentIncome, numberLimit);
  const yearToDateYoungReliefIncome = num(
    v.yearToDateYoungReliefIncome,
    numberLimit,
  );
  const notes = optionalText(v.notes, maxLength(2000));
  const bankAccountHolder = optionalText(v.bankAccountHolder, maxLength(200));
  const bankName = optionalText(v.bankName, maxLength(100));
  const bankAccountNumber = optionalText(v.bankAccountNumber, maxLength(34));

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
    issuePlace === null ||
    issueDate === null ||
    periodStart === null ||
    periodEnd === null ||
    grossAmount === null ||
    hourlyRate === null ||
    hoursWorked === null ||
    yearToDateTaxableIncome === null ||
    yearToDateEmploymentIncome === null ||
    yearToDateYoungReliefIncome === null ||
    notes === null ||
    bankAccountHolder === null ||
    bankName === null ||
    bankAccountNumber === null ||
    typeof v.voluntarySickness !== 'boolean' ||
    typeof v.youngRelief !== 'boolean' ||
    typeof noTaxAdvanceRequest !== 'boolean' ||
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
    issuePlace,
    issueDate,
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
    yearToDateEmploymentIncome,
    yearToDateYoungReliefIncome,
    noTaxAdvanceRequest,
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
