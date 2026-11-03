'use server';

import { getCurrentUserIdWithTerms } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import { INVOICE_UID_PATTERN } from '@/lib/invoice/generatorDraft';
import {
  getInvoiceNumberScope,
  isReservationForScope,
  reserveInvoiceNumberForScope,
} from '@/lib/invoice/invoiceNumbering';
import { parseParty } from '@/lib/invoice/parseParty';
import { sanitizeInvoiceForm } from '@/lib/invoice/sanitizeInvoiceForm';
import { getSavedInvoiceIncome } from '@/lib/invoice/savedInvoiceIncome';
import { getAllTaxParams } from '@/lib/invoice/taxParams';
import {
  isValidDate,
  isValidPesel,
  isValidPolishBankAccount,
  validateInvoiceForm,
} from '@/lib/invoice/validateInvoiceForm';
import { checkRateLimit } from '@/lib/rateLimit';
import { getSavedInvoiceForUser } from '@/lib/savedDataAccess';
import { encryptJson, encryptText } from '@/lib/savedDataCrypto';
import { upsertUserBankAccount } from '@/lib/userBankAccount';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type {
  ActionResult,
  InvoiceNumberReservation,
  SavedInvoiceSnapshot,
  UserBankAccountDto,
} from '@/types/savedData';
import { revalidatePath } from 'next/cache';

const NOT_SIGNED_IN = 'Zaloguj się, aby zapisywać dane.';

export type SaveInvoiceResult =
  | {
      ok: true;
      data: {
        id: string;
        invoiceNumber: string;
        updatedAt: string;
        savedInvoiceTaxableIncome: number;
      };
    }
  | {
      ok: false;
      error: string;
      currentSavedInvoiceTaxableIncome?: number;
      invoiceChanged?: boolean;
    };

export async function getSavedInvoiceSnapshot(
  identifier: string,
  byUid = false,
): Promise<ActionResult<SavedInvoiceSnapshot | null>> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  if (
    typeof identifier !== 'string' ||
    identifier.length === 0 ||
    identifier.length > 100 ||
    typeof byUid !== 'boolean' ||
    (byUid && !INVOICE_UID_PATTERN.test(identifier))
  ) {
    return { ok: false, error: 'Nieprawidłowy identyfikator rachunku.' };
  }
  const invoiceId = byUid
    ? (
        await prisma.invoice.findFirst({
          where: { userId, uid: identifier },
          select: { id: true },
        })
      )?.id
    : identifier;
  if (!invoiceId) return { ok: true, data: null };
  const invoice = await getSavedInvoiceForUser(userId, invoiceId);
  if (!invoice) return { ok: true, data: null };
  if (!invoice.data) {
    return { ok: false, error: 'Nie udało się odczytać zapisanego rachunku.' };
  }
  return { ok: true, data: { ...invoice, data: invoice.data } };
}

export async function getYearToDateInvoiceTaxableIncome(
  periodStart: string,
  contractorPesel: string,
  excludedInvoiceId?: string,
): Promise<ActionResult<number>> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  if (
    typeof periodStart !== 'string' ||
    !isValidDate(periodStart) ||
    Number(periodStart.slice(0, 4)) < 2000
  ) {
    return { ok: false, error: 'Nieprawidłowa data okresu rozliczeniowego.' };
  }
  if (typeof contractorPesel !== 'string' || !isValidPesel(contractorPesel)) {
    return { ok: false, error: 'Podaj prawidłowy PESEL zleceniobiorcy.' };
  }
  if (
    excludedInvoiceId !== undefined &&
    (typeof excludedInvoiceId !== 'string' ||
      excludedInvoiceId.length === 0 ||
      excludedInvoiceId.length > 100)
  ) {
    return { ok: false, error: 'Nieprawidłowy identyfikator rachunku.' };
  }

  const limit = await checkRateLimit('annualIncomeLookup', userId);
  if (!limit.ok) return { ok: false, error: limit.message };

  const year = Number(periodStart.slice(0, 4));
  const allTaxParams = await getAllTaxParams();
  const taxParams = [...allTaxParams]
    .reverse()
    .find((params) => params.year <= year);
  if (!taxParams) {
    return {
      ok: false,
      error: `Brak parametrów podatkowych dla roku ${year}; nie można zsumować rachunków.`,
    };
  }

  const result = await getSavedInvoiceIncome(
    userId,
    { periodStart, contractorPesel },
    taxParams,
    excludedInvoiceId,
  );
  return result.ok ? { ok: true, data: result.data.income } : result;
}

export async function reserveInvoiceNumber(
  year: number,
): Promise<ActionResult<InvoiceNumberReservation>> {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    return { ok: false, error: 'Nieprawidłowy rok numeracji.' };
  }

  const userId = await getCurrentUserIdWithTerms();
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
  expectedSavedInvoiceTaxableIncome?: number,
  expectedUpdatedAt?: string,
  creationUid?: string,
): Promise<SaveInvoiceResult> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };
  const limit = await checkRateLimit('saveInvoice', userId);
  if (!limit.ok) return { ok: false, error: limit.message };

  const optionsError = validateSaveOptions(
    invoiceId,
    creationUid,
    expectedUpdatedAt,
    expectedSavedInvoiceTaxableIncome,
    saveAccountToProfile,
  );
  if (optionsError) return { ok: false, error: optionsError };

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

  const profileAccount = getProfileAccount(form, saveAccountToProfile);
  const scope = getInvoiceNumberScope(userId);
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
    !invoiceId &&
    reservation &&
    (!Number.isInteger(reservationYear) ||
      !isReservationForScope(reservation, scope, reservationYear))
  ) {
    return { ok: false, error: 'Numer rachunku jest nieprawidłowy.' };
  }

  const result = await prisma.$transaction<SaveInvoiceResult>(
    async (tx) => {
      if (!invoiceId && creationUid) {
        const existing = await tx.invoice.findFirst({
          where: { userId, uid: creationUid },
          select: { id: true },
        });
        if (existing) {
          return {
            ok: false,
            error:
              'Ten rachunek został już zapisany. Wybierz wersję, którą chcesz dalej edytować.',
            invoiceChanged: true,
          };
        }
      }
      const savedIncome = await getSavedInvoiceIncome(
        userId,
        form,
        params,
        invoiceId,
        tx,
      );
      if (!savedIncome.ok) return savedIncome;

      const { income, current, latestSamePeriod } = savedIncome.data;
      if (current && current.updatedAt.toISOString() !== expectedUpdatedAt) {
        return {
          ok: false,
          error:
            'Rachunek został zmieniony w innym miejscu. Wybierz, którą wersję zachować.',
          invoiceChanged: true,
        };
      }
      if (income !== expectedSavedInvoiceTaxableIncome) {
        return {
          ok: false,
          error:
            'Dochód z zapisanych rachunków zmienił się. Sprawdź przeliczone kwoty i zapisz rachunek ponownie.',
          currentSavedInvoiceTaxableIncome: income,
        };
      }

      const { calculations } = calculateInvoice(
        {
          ...form,
          yearToDateTaxableIncome: form.yearToDateTaxableIncome + income,
        },
        params,
      );
      const values = getInvoiceValues(form, calculations.net);

      let saved: { id: string; invoiceNumber: string; updatedAt: Date };
      if (current) {
        const invoiceNumber =
          current.invoiceNumber ??
          (
            await reserveInvoiceNumberForScope(
              scope,
              new Date().getFullYear(),
              tx,
            )
          ).number;
        const updated = await tx.invoice.updateMany({
          where: { id: current.id, userId },
          data: { ...values, invoiceNumber },
        });
        if (updated.count === 0) {
          return {
            ok: false,
            error: 'Nie znaleziono rachunku.',
            invoiceChanged: true,
          };
        }
        const invoice = await tx.invoice.findFirstOrThrow({
          where: { id: current.id, userId },
          select: { id: true, updatedAt: true },
        });
        saved = { ...invoice, invoiceNumber };
      } else {
        const createdAt = new Date(
          Math.max(Date.now(), (latestSamePeriod?.getTime() ?? 0) + 1),
        );
        if (Number.isNaN(createdAt.getTime())) {
          return {
            ok: false,
            error:
              'Nieprawidłowa data wcześniejszego rachunku uniemożliwia zapis. Sprawdź dane w historii rachunków.',
          };
        }
        const assigned =
          reservation ??
          (await reserveInvoiceNumberForScope(
            scope,
            new Date().getFullYear(),
            tx,
          ));
        const invoice = await tx.invoice.create({
          data: {
            ...values,
            userId,
            uid: creationUid,
            invoiceNumber: assigned.number,
            createdAt,
          },
          select: { id: true, updatedAt: true },
        });
        saved = { ...invoice, invoiceNumber: assigned.number };
      }

      if (profileAccount) {
        await upsertUserBankAccount(userId, profileAccount, tx);
      }

      return {
        ok: true,
        data: {
          id: saved.id,
          invoiceNumber: saved.invoiceNumber,
          updatedAt: saved.updatedAt.toISOString(),
          savedInvoiceTaxableIncome: income,
        },
      };
    },
    { isolationLevel: 'Serializable' },
  );
  if (result.ok) {
    revalidatePath('/account/invoices');
    if (profileAccount) revalidatePath('/account');
  }
  return result;
}

function validateSaveOptions(
  invoiceId: string | undefined,
  creationUid: string | undefined,
  expectedUpdatedAt: string | undefined,
  expectedSavedInvoiceTaxableIncome: number | undefined,
  saveAccountToProfile: boolean | undefined,
): string | null {
  if (
    invoiceId !== undefined &&
    (typeof invoiceId !== 'string' ||
      invoiceId.length === 0 ||
      invoiceId.length > 100)
  ) {
    return 'Nieprawidłowy identyfikator rachunku.';
  }
  if (
    !invoiceId &&
    (typeof creationUid !== 'string' || !INVOICE_UID_PATTERN.test(creationUid))
  ) {
    return 'Brakuje identyfikatora tworzonego rachunku.';
  }
  if (
    invoiceId &&
    (typeof expectedUpdatedAt !== 'string' ||
      Number.isNaN(Date.parse(expectedUpdatedAt)))
  ) {
    return 'Brakuje wersji zapisanego rachunku.';
  }
  if (
    typeof expectedSavedInvoiceTaxableIncome !== 'number' ||
    !Number.isSafeInteger(expectedSavedInvoiceTaxableIncome) ||
    expectedSavedInvoiceTaxableIncome < 0
  ) {
    return 'Nieprawidłowa kwota dochodu z rachunków.';
  }
  if (
    saveAccountToProfile !== undefined &&
    typeof saveAccountToProfile !== 'boolean'
  ) {
    return 'Nieprawidłowy wybór rachunku w profilu.';
  }
  return null;
}

function getProfileAccount(
  form: InvoiceFormData,
  saveAccountToProfile?: boolean,
): UserBankAccountDto | null {
  return saveAccountToProfile &&
    form.paymentMethod === 'TRANSFER' &&
    form.transferTarget === 'SAVED_ACCOUNT' &&
    form.bankAccountNumber &&
    form.bankName &&
    form.bankAccountHolder &&
    isValidPolishBankAccount(form.bankAccountNumber)
    ? {
        accountHolder: form.bankAccountHolder.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.bankAccountNumber
          .replace(/[\s-]/g, '')
          .toUpperCase()
          .replace(/^PL/, ''),
      }
    : null;
}

function getInvoiceValues(form: InvoiceFormData, net: number) {
  return {
    title: encryptText(
      form.contractNumber?.trim() || `Rachunek ${form.periodStart}`,
    ),
    contractNumber: form.contractNumber
      ? encryptText(form.contractNumber)
      : null,
    issuePlace: form.issuePlace?.trim() || null,
    issueDate: form.issueDate || null,
    periodStart: form.periodStart,
    net,
    data: encryptJson(form),
  };
}

export async function deleteInvoice(
  invoiceId: string,
): Promise<ActionResult<number>> {
  const userId = await getCurrentUserIdWithTerms();
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
  const userId = await getCurrentUserIdWithTerms();
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
  const userId = await getCurrentUserIdWithTerms();
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
  const userId = await getCurrentUserIdWithTerms();
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
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, error: NOT_SIGNED_IN };

  const { count } = await prisma.invoice.deleteMany({ where: { userId } });
  revalidatePath('/account/invoices');
  return { ok: true, data: count };
}

export async function deleteAllParties(): Promise<ActionResult<number>> {
  const userId = await getCurrentUserIdWithTerms();
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
  const userId = await getCurrentUserIdWithTerms();
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

  await upsertUserBankAccount(userId, {
    accountHolder,
    bankName,
    accountNumber,
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
