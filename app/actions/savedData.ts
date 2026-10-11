'use server';

import { calculateInvoice } from '@/lib/calculateInvoice';
import { getCurrentUserId } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import {
  getInvoiceNumberScope,
  isReservationForScope,
  reserveInvoiceNumberForScope,
} from '@/lib/invoiceNumbering';
import { sanitizeInvoiceForm } from '@/lib/sanitizeInvoiceForm';
import { encryptJson, encryptText } from '@/lib/savedDataCrypto';
import { getAllTaxParams } from '@/lib/taxParams';
import {
  isValidNip,
  isValidPesel,
  validateInvoiceForm,
} from '@/lib/validateInvoiceForm';
import type { ActionResult, InvoiceNumberReservation } from '@/types/savedData';

const NOT_SIGNED_IN = 'Zaloguj się, aby zapisywać dane.';

export async function reserveInvoiceNumber(
  year: number,
): Promise<ActionResult<InvoiceNumberReservation>> {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    return { ok: false, error: 'Nieprawidłowy rok numeracji.' };
  }

  const userId = await getCurrentUserId();
  const reservation = await reserveInvoiceNumberForScope(
    getInvoiceNumberScope(userId),
    year,
  );
  return { ok: true, data: reservation };
}

export async function saveInvoice(
  input: unknown,
  invoiceId?: string,
  reservation?: InvoiceNumberReservation,
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  const form = sanitizeInvoiceForm(input);
  if (!form) return { ok: false, error: 'Nieprawidłowe dane formularza.' };

  const taxYear = Number(form.periodStart.slice(0, 4));
  const params = (await getAllTaxParams())
    .reverse()
    .find((p) => p.year <= taxYear);
  if (!params) {
    return {
      ok: false,
      error: `Brak parametrów podatkowych dla roku ${taxYear}.`,
    };
  }

  const errors = validateInvoiceForm(form, params);
  if (errors.length > 0) return { ok: false, error: errors[0] };

  const { calculations } = calculateInvoice(form, params);
  const scope = getInvoiceNumberScope(userId);
  const values = {
    title: encryptText(
      form.contractNumber?.trim() || `Rachunek ${form.periodStart}`,
    ),
    contractNumber: form.contractNumber
      ? encryptText(form.contractNumber)
      : null,
    periodStart: form.periodStart,
    net: calculations.net,
    data: encryptJson(form),
  };

  if (invoiceId) {
    if (typeof invoiceId !== 'string' || invoiceId.length > 100) {
      return { ok: false, error: 'Nieprawidłowy identyfikator rachunku.' };
    }
    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: { invoiceNumber: true },
    });
    if (!existing) return { ok: false, error: 'Nie znaleziono rachunku.' };
    const invoiceNumber =
      existing.invoiceNumber ??
      (await reserveInvoiceNumberForScope(scope, new Date().getFullYear()))
        .number;
    const updated = await prisma.invoice.updateMany({
      where: { id: invoiceId, userId },
      data: { ...values, invoiceNumber },
    });
    if (updated.count === 0) {
      return { ok: false, error: 'Nie znaleziono rachunku.' };
    }
    return { ok: true, data: { id: invoiceId, invoiceNumber } };
  }

  const reservationNumber =
    typeof reservation === 'object' &&
    reservation !== null &&
    typeof reservation.number === 'string'
      ? reservation.number
      : null;
  const reservationYear = reservationNumber
    ? Number(reservationNumber.match(/\/(\d{4})$/)?.[1])
    : new Date().getFullYear();
  if (
    reservation &&
    (!Number.isInteger(reservationYear) ||
      !isReservationForScope(reservation, scope, reservationYear))
  ) {
    return { ok: false, error: 'Numer rachunku jest nieprawidłowy.' };
  }
  const assigned =
    reservation ??
    (await reserveInvoiceNumberForScope(scope, new Date().getFullYear()));
  const created = await prisma.invoice.create({
    data: {
      ...values,
      userId,
      invoiceNumber: assigned.number,
    },
    select: { id: true, invoiceNumber: true },
  });
  return {
    ok: true,
    data: { id: created.id, invoiceNumber: assigned.number },
  };
}

export async function deleteInvoice(invoiceId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  if (
    typeof invoiceId !== 'string' ||
    invoiceId.length === 0 ||
    invoiceId.length > 100
  ) {
    return { ok: false, error: 'Nieprawidłowy identyfikator rachunku.' };
  }

  await prisma.invoice.deleteMany({ where: { id: invoiceId, userId } });
  return { ok: true, data: undefined };
}

type ValidParty = {
  kind: 'CLIENT' | 'CONTRACTOR';
  clientType: 'company' | 'private' | null;
  name: string;
  address: string;
  nip: string | null;
  pesel: string | null;
};

function parseParty(
  input: unknown,
): { ok: true; party: ValidParty } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false as const, error: 'Nieprawidłowe dane strony.' };
  }

  const value = input as Record<string, unknown>;
  if (
    (value.kind !== 'CLIENT' && value.kind !== 'CONTRACTOR') ||
    (value.clientType !== undefined &&
      value.clientType !== 'company' &&
      value.clientType !== 'private') ||
    typeof value.name !== 'string' ||
    value.name.length > 200 ||
    typeof value.address !== 'string' ||
    value.address.length > 300 ||
    (value.nip !== undefined && typeof value.nip !== 'string') ||
    (value.pesel !== undefined && typeof value.pesel !== 'string')
  ) {
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

export async function saveParty(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  const parsed = parseParty(input);
  if (!parsed.ok) return parsed;
  const { kind, clientType, name, address, nip, pesel } = parsed.party;

  const existing = await prisma.savedParty.count({ where: { userId } });
  if (existing >= 100) {
    return { ok: false, error: 'Osiągnięto limit zapisanych danych (100).' };
  }

  const created = await prisma.savedParty.create({
    data: {
      userId,
      kind,
      label: encryptText(name),
      clientType,
      name: encryptText(name),
      address: encryptText(address),
      nip: nip === null ? null : encryptText(nip),
      pesel: pesel === null ? null : encryptText(pesel),
    },
  });
  return { ok: true, data: { id: created.id } };
}

export async function updateParty(
  partyId: string,
  input: unknown,
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  if (
    typeof partyId !== 'string' ||
    partyId.length === 0 ||
    partyId.length > 100
  ) {
    return { ok: false, error: 'Nieprawidłowy identyfikator danych strony.' };
  }

  const parsed = parseParty(input);
  if (!parsed.ok) return parsed;
  const { kind, clientType, name, address, nip, pesel } = parsed.party;

  const result = await prisma.savedParty.updateMany({
    where: { id: partyId, userId },
    data: {
      kind,
      label: encryptText(name),
      clientType,
      name: encryptText(name),
      address: encryptText(address),
      nip: nip === null ? null : encryptText(nip),
      pesel: pesel === null ? null : encryptText(pesel),
    },
  });
  if (result.count === 0) return { ok: false, error: 'Nie znaleziono wpisu.' };
  return { ok: true, data: undefined };
}

export async function deleteParty(partyId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  if (
    typeof partyId !== 'string' ||
    partyId.length === 0 ||
    partyId.length > 100
  ) {
    return { ok: false, error: 'Nieprawidłowy identyfikator danych strony.' };
  }

  await prisma.savedParty.deleteMany({ where: { id: partyId, userId } });
  return { ok: true, data: undefined };
}

export async function deleteAllInvoices(): Promise<ActionResult<number>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  const { count } = await prisma.invoice.deleteMany({ where: { userId } });
  return { ok: true, data: count };
}

export async function deleteAllParties(): Promise<ActionResult<number>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  const { count } = await prisma.savedParty.deleteMany({ where: { userId } });
  return { ok: true, data: count };
}
