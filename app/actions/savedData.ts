'use server';

import { calculateInvoice } from '@/lib/calculateInvoice';
import { getCurrentUserId } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import {
  getInvoiceNumberScope,
  isReservationForScope,
  reserveInvoiceNumberForScope,
} from '@/lib/invoiceNumbering';
import { parseParty } from '@/lib/parseParty';
import { checkRateLimit } from '@/lib/rateLimit';
import { sanitizeInvoiceForm } from '@/lib/sanitizeInvoiceForm';
import { encryptJson, encryptText } from '@/lib/savedDataCrypto';
import { getAllTaxParams } from '@/lib/taxParams';
import {
  isValidPolishBankAccount,
  validateInvoiceForm,
} from '@/lib/validateInvoiceForm';
import type {
  ActionResult,
  InvoiceNumberReservation,
  UserBankAccountDto,
} from '@/types/savedData';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';

const NOT_SIGNED_IN = 'Zaloguj się, aby zapisywać dane.';

export async function reserveInvoiceNumber(
  year: number,
): Promise<ActionResult<InvoiceNumberReservation>> {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    return { ok: false, error: 'Nieprawidłowy rok numeracji.' };
  }

  const userId = await getCurrentUserId();
  const limit = await checkRateLimit('reserveNumber', userId);
  if (!limit.ok) return { ok: false, error: limit.message };
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
  saveAccountToProfile?: boolean,
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  const limit = await checkRateLimit('saveInvoice', userId);
  if (!limit.ok) return { ok: false, error: limit.message };

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

  if (
    saveAccountToProfile &&
    form.paymentMethod === 'TRANSFER' &&
    form.transferTarget === 'SAVED_ACCOUNT' &&
    form.bankAccountNumber &&
    form.bankName &&
    form.bankAccountHolder &&
    isValidPolishBankAccount(form.bankAccountNumber)
  ) {
    const accNum = form.bankAccountNumber
      .replace(/[\s-]/g, '')
      .toUpperCase()
      .replace(/^PL/, '');
    await prisma.userBankAccount.upsert({
      where: { userId },
      create: {
        userId,
        accountHolder: encryptText(form.bankAccountHolder.trim()),
        bankName: encryptText(form.bankName.trim()),
        accountNumber: encryptText(accNum),
      },
      update: {
        accountHolder: encryptText(form.bankAccountHolder.trim()),
        bankName: encryptText(form.bankName.trim()),
        accountNumber: encryptText(accNum),
      },
    });
    revalidatePath('/account');
  }

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
      uid: randomUUID(),
      invoiceNumber: assigned.number,
    },
    select: { id: true, invoiceNumber: true },
  });
  return {
    ok: true,
    data: { id: created.id, invoiceNumber: assigned.number },
  };
}

export async function deleteInvoice(
  invoiceId: string,
): Promise<ActionResult<number>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  if (
    typeof invoiceId !== 'string' ||
    invoiceId.length === 0 ||
    invoiceId.length > 100
  ) {
    return { ok: false, error: 'Nieprawidłowy identyfikator rachunku.' };
  }

  const { count } = await prisma.invoice.deleteMany({
    where: { id: invoiceId, userId },
  });
  if (count === 0) return { ok: false, error: 'Nie znaleziono rachunku.' };
  revalidatePath('/account/invoices');
  return { ok: true, data: count };
}

export async function saveParty(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  const limit = await checkRateLimit('saveParty', userId);
  if (!limit.ok) return { ok: false, error: limit.message };

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

export async function deleteParty(
  partyId: string,
): Promise<ActionResult<number>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  if (
    typeof partyId !== 'string' ||
    partyId.length === 0 ||
    partyId.length > 100
  ) {
    return { ok: false, error: 'Nieprawidłowy identyfikator danych strony.' };
  }

  const { count } = await prisma.savedParty.deleteMany({
    where: { id: partyId, userId },
  });
  if (count === 0) return { ok: false, error: 'Nie znaleziono wpisu.' };
  revalidatePath('/account/invoices');
  return { ok: true, data: count };
}

export async function deleteAllInvoices(): Promise<ActionResult<number>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  const { count } = await prisma.invoice.deleteMany({ where: { userId } });
  revalidatePath('/account/invoices');
  return { ok: true, data: count };
}

export async function deleteAllParties(): Promise<ActionResult<number>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  const { count } = await prisma.savedParty.deleteMany({ where: { userId } });
  revalidatePath('/account/invoices');
  return { ok: true, data: count };
}

export async function saveUserBankAccountAction(data: {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
}): Promise<ActionResult<UserBankAccountDto>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  const limit = await checkRateLimit('saveBankAccount', userId);
  if (!limit.ok) return { ok: false, error: limit.message };

  const accountHolder = data.accountHolder.trim();
  const bankName = data.bankName.trim();
  const accountNumber = data.accountNumber
    .replace(/[\s-]/g, '')
    .toUpperCase()
    .replace(/^PL/, '');

  if (!accountHolder || accountHolder.length > 200) {
    return { ok: false, error: 'Podaj nazwę właściciela rachunku.' };
  }
  if (!bankName || bankName.length > 100) {
    return { ok: false, error: 'Podaj nazwę banku.' };
  }
  if (!isValidPolishBankAccount(accountNumber)) {
    return {
      ok: false,
      error: 'Podaj prawidłowy polski numer rachunku bankowego (26 cyfr).',
    };
  }

  await prisma.userBankAccount.upsert({
    where: { userId },
    create: {
      userId,
      accountHolder: encryptText(accountHolder),
      bankName: encryptText(bankName),
      accountNumber: encryptText(accountNumber),
    },
    update: {
      accountHolder: encryptText(accountHolder),
      bankName: encryptText(bankName),
      accountNumber: encryptText(accountNumber),
    },
  });

  revalidatePath('/account');
  revalidatePath('/generator');

  return {
    ok: true,
    data: {
      accountHolder,
      bankName,
      accountNumber,
    },
  };
}
