import type { InvoiceFormData } from '@/types/invoiceForm';

export interface SavedPartyDto {
  id: string;
  kind: 'CLIENT' | 'CONTRACTOR';
  label: string;
  clientType: 'company' | 'private' | null;
  name: string;
  address: string;
  nip: string | null;
  pesel: string | null;
}

export interface UserBankAccountDto {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
}

export interface InvoiceNumberReservation {
  number: string;
  token: string;
}

export interface SavedInvoiceSnapshot {
  id: string;
  invoiceNumber: string;
  updatedAt: string;
  data: InvoiceFormData;
}

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };
