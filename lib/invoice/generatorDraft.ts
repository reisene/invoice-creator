import { sanitizeInvoiceForm } from '@/lib/invoice/sanitizeInvoiceForm';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { InvoiceNumberReservation } from '@/types/savedData';

export interface GeneratorDraft {
  version: 1;
  formData: InvoiceFormData;
  invoiceId?: string;
  invoiceNumber?: string;
  numberReservation?: InvoiceNumberReservation;
  updatedAt?: string;
  creationUid?: string;
}

export const INVOICE_UID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generatorDraftKey(scope: string, context: string): string {
  return `generator_draft_v1:${scope}:${context}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalInvoiceId(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === 'string' && value.length > 0 && value.length <= 100)
  );
}

function isOptionalInvoiceNumber(value: unknown): value is string | undefined {
  return (
    value === undefined || (typeof value === 'string' && value.length <= 100)
  );
}

function isOptionalUpdatedAt(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === 'string' && !Number.isNaN(Date.parse(value)))
  );
}

function isOptionalCreationUid(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === 'string' && INVOICE_UID_PATTERN.test(value))
  );
}

function isNumberReservation(
  value: unknown,
): value is InvoiceNumberReservation {
  return (
    isRecord(value) &&
    typeof value.number === 'string' &&
    typeof value.token === 'string'
  );
}

export function parseGeneratorDraft(raw: string): GeneratorDraft | null {
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.version !== 1) return null;

  const formData = sanitizeInvoiceForm(value.formData, { draft: true });
  if (!formData) return null;
  const {
    invoiceId,
    invoiceNumber,
    numberReservation,
    updatedAt,
    creationUid,
  } = value;
  if (
    !isOptionalInvoiceId(invoiceId) ||
    !isOptionalInvoiceNumber(invoiceNumber) ||
    !isOptionalUpdatedAt(updatedAt) ||
    (invoiceId !== undefined && updatedAt === undefined) ||
    !isOptionalCreationUid(creationUid) ||
    (numberReservation !== undefined &&
      (!isNumberReservation(numberReservation) ||
        numberReservation.number !== invoiceNumber))
  ) {
    return null;
  }

  return {
    version: 1,
    formData,
    invoiceId,
    invoiceNumber,
    updatedAt,
    creationUid,
    numberReservation: isNumberReservation(numberReservation)
      ? { number: numberReservation.number, token: numberReservation.token }
      : undefined,
  };
}

export function parseGeneratorPreset(
  raw: string,
  defaults: InvoiceFormData,
): InvoiceFormData | null {
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value)) return null;
  return sanitizeInvoiceForm({ ...defaults, ...value }, { draft: true });
}
