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

export interface InvoiceNumberReservation {
  number: string;
  token: string;
}

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };
