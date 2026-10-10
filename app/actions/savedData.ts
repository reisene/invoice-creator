'use server';

import { calculateInvoice } from '@/lib/calculateInvoice';
import { getCurrentUserId } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import { sanitizeInvoiceForm } from '@/lib/sanitizeInvoiceForm';
import { getAllTaxParams } from '@/lib/taxParams';
import {
  isValidNip,
  isValidPesel,
  validateInvoiceForm,
} from '@/lib/validateInvoiceForm';
import type { ActionResult } from '@/types/savedData';

const NOT_SIGNED_IN = 'Zaloguj się, aby zapisywać dane.';

export async function saveInvoice(
  input: unknown,
  invoiceId?: string,
): Promise<ActionResult<{ id: string }>> {
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
  const values = {
    title: form.contractNumber?.trim() || `Rachunek ${form.periodStart}`,
    contractNumber: form.contractNumber ?? null,
    periodStart: form.periodStart,
    net: calculations.net,
    data: JSON.parse(JSON.stringify(form)),
  };

  if (invoiceId) {
    const updated = await prisma.invoice.updateMany({
      where: { id: invoiceId, userId },
      data: values,
    });
    if (updated.count === 0) {
      return { ok: false, error: 'Nie znaleziono rachunku.' };
    }
    return { ok: true, data: { id: invoiceId } };
  }

  const created = await prisma.invoice.create({ data: { ...values, userId } });
  return { ok: true, data: { id: created.id } };
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

export async function saveParty(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Nieprawidłowe dane strony.' };
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
    return { ok: false, error: 'Nieprawidłowe dane strony.' };
  }

  const name = value.name.trim();
  const address = value.address.trim();
  const nip = (value.nip ?? '').toString().trim() || null;
  const pesel = (value.pesel ?? '').toString().trim() || null;
  const kind = value.kind;
  const clientType = kind === 'CLIENT' ? (value.clientType ?? 'company') : null;

  if (nip && nip.length > 20) {
    return { ok: false, error: 'NIP jest zbyt długi.' };
  }
  if (pesel && pesel.length > 20) {
    return { ok: false, error: 'PESEL jest zbyt długi.' };
  }

  if (!name || !address) return { ok: false, error: 'Podaj nazwę i adres.' };
  if (nip && !isValidNip(nip)) {
    return { ok: false, error: 'NIP jest nieprawidłowy.' };
  }
  if (pesel && !isValidPesel(pesel)) {
    return { ok: false, error: 'PESEL jest nieprawidłowy.' };
  }

  const existing = await prisma.savedParty.count({ where: { userId } });
  if (existing >= 100) {
    return { ok: false, error: 'Osiągnięto limit zapisanych danych (100).' };
  }

  const created = await prisma.savedParty.create({
    data: { userId, kind, label: name, clientType, name, address, nip, pesel },
  });
  return { ok: true, data: { id: created.id } };
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
