import { isValidNip, isValidPesel } from '@/lib/invoice/validateInvoiceForm';

export type ValidParty = {
  kind: 'CLIENT' | 'CONTRACTOR';
  clientType: 'company' | 'private' | null;
  name: string;
  address: string;
  nip: string | null;
  pesel: string | null;
};

type PartyInput = {
  kind: ValidParty['kind'];
  clientType?: 'company' | 'private' | null;
  name: string;
  address: string;
  nip?: string | null;
  pesel?: string | null;
};

function isOptionalText(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function isPartyInput(value: Record<string, unknown>): value is PartyInput {
  return (
    (value.kind === 'CLIENT' || value.kind === 'CONTRACTOR') &&
    (value.clientType === undefined ||
      value.clientType === null ||
      value.clientType === 'company' ||
      value.clientType === 'private') &&
    typeof value.name === 'string' &&
    value.name.length <= 200 &&
    typeof value.address === 'string' &&
    value.address.length <= 300 &&
    isOptionalText(value.nip) &&
    isOptionalText(value.pesel)
  );
}

export function parseParty(
  input: unknown,
): { ok: true; party: ValidParty } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false as const, error: 'Nieprawidłowe dane strony.' };
  }

  const value = input as Record<string, unknown>;
  if (!isPartyInput(value)) {
    return { ok: false as const, error: 'Nieprawidłowe dane strony.' };
  }

  const name = value.name.trim();
  const address = value.address.trim();
  const nip = (value.nip ?? '').toString().trim() || null;
  const pesel = (value.pesel ?? '').toString().trim() || null;
  const kind = value.kind;
  const clientType = kind === 'CLIENT' ? (value.clientType ?? 'company') : null;

  if (nip && nip.length > 20) {
    return { ok: false as const, error: 'NIP jest zbyt długi.' };
  }
  if (pesel && pesel.length > 20) {
    return { ok: false as const, error: 'PESEL jest zbyt długi.' };
  }

  if (!name || !address)
    return { ok: false as const, error: 'Podaj nazwę i adres.' };
  if (nip && !isValidNip(nip)) {
    return { ok: false as const, error: 'NIP jest nieprawidłowy.' };
  }
  if (pesel && !isValidPesel(pesel)) {
    return { ok: false as const, error: 'PESEL jest nieprawidłowy.' };
  }

  return {
    ok: true,
    party: { kind, clientType, name, address, nip, pesel },
  };
}
