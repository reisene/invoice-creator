'use server';

import type { Prisma } from '@/generated/prisma';
import { getCurrentUserIdWithTerms } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import { INVOICE_UID_PATTERN } from '@/lib/invoice/generatorDraft';
import {
  getPreviousInvoiceTaxableIncome,
  type InvoiceIncomeEntry,
} from '@/lib/invoice/invoiceIncome';
import { getInvoiceNumberScope } from '@/lib/invoice/invoiceNumbering';
import { parseParty } from '@/lib/invoice/parseParty';
import { sanitizeInvoiceForm } from '@/lib/invoice/sanitizeInvoiceForm';
import { getAllTaxParams } from '@/lib/invoice/taxParams';
import {
  isValidPolishBankAccount,
  validateInvoiceForm,
} from '@/lib/invoice/validateInvoiceForm';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  getSavedPartiesForUser,
  getUserBankAccount,
} from '@/lib/savedDataAccess';
import { decryptJson, encryptJson, encryptText } from '@/lib/savedDataCrypto';
import { logServerError } from '@/lib/serverLogger';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { ActionResult } from '@/types/savedData';
import type { TaxParams } from '@/types/taxParams';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';

const MAX_FILE_CHARS = 5_000_000;
const MAX_INVOICES = 500;
const MAX_PARTIES = 100;

export interface ImportSummary {
  committed: boolean;
  invoices: { add: number; duplicates: number; invalid: number };
  parties: { add: number; duplicates: number; invalid: number };
  bankAccount: 'add' | 'exists' | 'none' | 'invalid';
  problems: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseImportPayload(raw: string): ActionResult<{
  invoices: unknown[];
  parties: unknown[];
  bankAccount: unknown;
}> {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, error: 'Plik jest pusty.' };
  }
  if (raw.length > MAX_FILE_CHARS) {
    return { ok: false, error: 'Plik jest zbyt duży (maks. ok. 5 MB).' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'To nie jest prawidłowy plik JSON.' };
  }
  if (!isRecord(payload)) {
    return { ok: false, error: 'Nieprawidłowy format pliku.' };
  }
  if (payload.version !== undefined && payload.version !== 1) {
    return { ok: false, error: 'Nieobsługiwana wersja pliku.' };
  }
  const invoicesIn = payload.invoices ?? [];
  const partiesIn = payload.parties ?? [];
  if (!Array.isArray(invoicesIn) || !Array.isArray(partiesIn)) {
    return { ok: false, error: 'Nieprawidłowy format pliku.' };
  }
  if (invoicesIn.length > MAX_INVOICES || partiesIn.length > MAX_PARTIES) {
    return {
      ok: false,
      error: `Plik zawiera zbyt wiele rekordów (maks. ${MAX_INVOICES} rachunków i ${MAX_PARTIES} stron).`,
    };
  }
  return {
    ok: true,
    data: {
      invoices: invoicesIn,
      parties: partiesIn,
      bankAccount: payload.bankAccount,
    },
  };
}

export async function importUserData(
  raw: string,
  commit: boolean,
): Promise<ActionResult<ImportSummary>> {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) return { ok: false, error: 'Zaloguj się, aby importować dane.' };
  const limit = await checkRateLimit('importData', userId);
  if (!limit.ok) return { ok: false, error: limit.message };
  const parsedPayload = parseImportPayload(raw);
  if (!parsedPayload.ok) return parsedPayload;
  const payload = parsedPayload.data;
  const invoicesIn = payload.invoices;
  const partiesIn = payload.parties;
  const scope = getInvoiceNumberScope(userId);
  const taxParams = (await getAllTaxParams()).reverse();
  const problems: string[] = [];
  const summary: ImportSummary = {
    committed: commit,
    invoices: { add: 0, duplicates: 0, invalid: 0 },
    parties: { add: 0, duplicates: 0, invalid: 0 },
    bankAccount: 'none',
    problems,
  };

  const existingInvoices = await prisma.invoice.findMany({
    where: { userId },
    select: { invoiceNumber: true, uid: true },
  });
  const existingNumbers = new Set(existingInvoices.map((r) => r.invoiceNumber));
  const existingUids = new Set(existingInvoices.map((r) => r.uid));
  const invoiceCandidates: {
    uid: string;
    invoiceNumber: string | null;
    createdAt: Date;
    form: InvoiceFormData;
    params: TaxParams;
  }[] = [];
  const maxPerYear = new Map<number, number>();
  const importStartedAt = Date.now();

  invoicesIn.forEach((item, index) => {
    const label = `Rachunek #${index + 1}`;
    const parsed = parseImportedInvoice(
      item,
      taxParams,
      importStartedAt + index,
    );
    if (!parsed.ok) {
      summary.invoices.invalid++;
      problems.push(`${label}: ${parsed.error}`);
      return;
    }
    const { form, params, createdAt } = parsed.data;

    const rawUid =
      isRecord(item) && typeof item.uid === 'string' ? item.uid.trim() : '';
    const uid = INVOICE_UID_PATTERN.test(rawUid)
      ? rawUid.toLowerCase()
      : randomUUID();
    if (existingUids.has(uid)) {
      summary.invoices.duplicates++;
      return;
    }

    const rawNumber =
      isRecord(item) && typeof item.invoiceNumber === 'string'
        ? item.invoiceNumber.trim()
        : '';
    const match = rawNumber.match(/^(\d{1,9})\/(\d{4})$/);
    const invoiceNumber = match ? rawNumber : null;
    if (invoiceNumber && existingNumbers.has(invoiceNumber)) {
      summary.invoices.duplicates++;
      return;
    }
    if (invoiceNumber) existingNumbers.add(invoiceNumber);
    existingUids.add(uid);

    if (match) {
      const year = Number(match[2]);
      maxPerYear.set(
        year,
        Math.max(maxPerYear.get(year) ?? 0, Number(match[1])),
      );
    }

    summary.invoices.add++;
    if (!commit) return;
    invoiceCandidates.push({ uid, invoiceNumber, createdAt, form, params });
  });

  const existingParties = await getSavedPartiesForUser(userId);
  const partyKey = (p: {
    kind: string;
    name: string;
    address: string;
    nip?: string | null;
    pesel?: string | null;
  }) =>
    [p.kind, p.name, p.address, p.nip ?? '', p.pesel ?? '']
      .join('|')
      .toLowerCase();
  const seenParties = new Set(existingParties.map(partyKey));
  let partyCount = existingParties.length;
  const partyRows: Prisma.SavedPartyCreateManyInput[] = [];

  partiesIn.forEach((item, index) => {
    const parsed = parseParty(item);
    if (!parsed.ok) {
      summary.parties.invalid++;
      problems.push(`Strona #${index + 1}: ${parsed.error}`);
      return;
    }
    const party = parsed.party;
    const key = partyKey(party);
    if (seenParties.has(key)) {
      summary.parties.duplicates++;
      return;
    }
    if (partyCount >= MAX_PARTIES) {
      summary.parties.invalid++;
      problems.push(`Strona #${index + 1}: przekroczono limit ${MAX_PARTIES}.`);
      return;
    }
    seenParties.add(key);
    partyCount++;
    summary.parties.add++;
    partyRows.push({
      userId,
      kind: party.kind,
      label: encryptText(party.name),
      clientType: party.clientType,
      name: encryptText(party.name),
      address: encryptText(party.address),
      nip: party.nip === null ? null : encryptText(party.nip),
      pesel: party.pesel === null ? null : encryptText(party.pesel),
    });
  });

  let bankRow: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
  } | null = null;
  if (isRecord(payload.bankAccount)) {
    const b = payload.bankAccount;
    const accountHolder =
      typeof b.accountHolder === 'string' ? b.accountHolder.trim() : '';
    const bankName = typeof b.bankName === 'string' ? b.bankName.trim() : '';
    const accountNumber =
      typeof b.accountNumber === 'string'
        ? b.accountNumber.replace(/[\s-]/g, '').toUpperCase()
        : '';
    if (
      !accountHolder ||
      accountHolder.length > 200 ||
      !bankName ||
      bankName.length > 100 ||
      !isValidPolishBankAccount(accountNumber)
    ) {
      summary.bankAccount = 'invalid';
    } else if (await getUserBankAccount(userId)) {
      summary.bankAccount = 'exists';
    } else {
      summary.bankAccount = 'add';
      bankRow = { accountHolder, bankName, accountNumber };
    }
  }

  if (commit) {
    try {
      const result = await prisma.$transaction(
        async (tx): Promise<ActionResult> => {
          const incomeEntries: InvoiceIncomeEntry[] = [];
          if (invoiceCandidates.length > 0) {
            const years = new Set(
              invoiceCandidates.map((candidate) =>
                candidate.form.periodStart.slice(0, 4),
              ),
            );
            const currentInvoices = await tx.invoice.findMany({
              where: { userId },
              select: {
                id: true,
                uid: true,
                periodStart: true,
                createdAt: true,
                data: true,
              },
            });
            for (const invoice of currentInvoices) {
              if (!years.has(invoice.periodStart.slice(0, 4))) continue;
              const form = sanitizeInvoiceForm(decryptJson(invoice.data).data);
              if (!form || form.periodStart !== invoice.periodStart) {
                return {
                  ok: false,
                  error:
                    'Nie udało się odczytać jednego z zapisanych rachunków. Popraw lub usuń go przed importem rachunków z tego roku.',
                };
              }
              incomeEntries.push({
                id: invoice.id,
                uid: invoice.uid,
                createdAt: invoice.createdAt,
                form,
              });
            }
            incomeEntries.push(
              ...invoiceCandidates.map((candidate) => ({
                id: candidate.uid,
                uid: candidate.uid,
                createdAt: candidate.createdAt,
                form: candidate.form,
              })),
            );
          }

          const invoiceRows: Prisma.InvoiceCreateManyInput[] =
            invoiceCandidates.map((candidate) => {
              const { form, params } = candidate;
              const savedIncome = getPreviousInvoiceTaxableIncome(
                incomeEntries,
                {
                  id: candidate.uid,
                  uid: candidate.uid,
                  createdAt: candidate.createdAt,
                  periodStart: form.periodStart,
                  contractorPesel: form.contractorPesel,
                },
                params,
              );
              const { calculations } = calculateInvoice(
                {
                  ...form,
                  yearToDateTaxableIncome:
                    form.yearToDateTaxableIncome + savedIncome,
                },
                params,
              );
              return {
                userId,
                uid: candidate.uid,
                invoiceNumber: candidate.invoiceNumber,
                createdAt: candidate.createdAt,
                title: encryptText(
                  form.contractNumber?.trim() || `Rachunek ${form.periodStart}`,
                ),
                contractNumber: form.contractNumber
                  ? encryptText(form.contractNumber)
                  : null,
                issuePlace: form.issuePlace?.trim() || null,
                issueDate: form.issueDate || null,
                periodStart: form.periodStart,
                net: calculations.net,
                data: encryptJson(form),
              };
            });

          await tx.invoice.createMany({ data: invoiceRows });
          await tx.savedParty.createMany({ data: partyRows });
          for (const [year, value] of maxPerYear) {
            await tx.invoiceSequence.upsert({
              where: { scope_year: { scope, year } },
              create: { scope, year, value },
              update: {},
            });
            await tx.invoiceSequence.updateMany({
              where: { scope, year, value: { lt: value } },
              data: { value },
            });
          }
          if (bankRow) {
            await tx.userBankAccount.create({
              data: {
                userId,
                accountHolder: encryptText(bankRow.accountHolder),
                bankName: encryptText(bankRow.bankName),
                accountNumber: encryptText(bankRow.accountNumber),
              },
            });
          }
          return { ok: true, data: undefined };
        },
        { isolationLevel: 'Serializable' },
      );
      if (!result.ok) return result;
    } catch (error) {
      logServerError('[account/import] Failed to commit imported data.', error);
      return {
        ok: false,
        error:
          'Nie udało się zaimportować danych (np. konflikt numerów rachunków). Nic nie zostało zapisane.',
      };
    }
    revalidatePath('/account');
    revalidatePath('/account/invoices');
  }

  summary.problems = problems.slice(0, 10);
  return { ok: true, data: summary };
}

function parseImportedInvoice(
  item: unknown,
  taxParams: TaxParams[],
  fallbackCreatedAt: number,
): ActionResult<{ form: InvoiceFormData; params: TaxParams; createdAt: Date }> {
  const form = isRecord(item) ? sanitizeInvoiceForm(item.data) : null;
  const params = form
    ? taxParams.find((p) => p.year <= Number(form.periodStart.slice(0, 4)))
    : undefined;
  if (!form || !params) {
    return { ok: false, error: 'nieprawidłowe dane.' };
  }
  const isLegacyInvoice =
    isRecord(item) &&
    isRecord(item.data) &&
    item.data.issuePlace === undefined &&
    item.data.issueDate === undefined;
  const errors = validateInvoiceForm(form, params, {
    allowMissingIssueDetails: isLegacyInvoice,
  });
  if (errors.length > 0) return { ok: false, error: errors[0] };

  const rawCreatedAt = isRecord(item)
    ? (item.createdAt ?? item.updatedAt)
    : undefined;
  const createdAt = parseImportedDate(rawCreatedAt, fallbackCreatedAt);
  if (!createdAt) {
    return { ok: false, error: 'nieprawidłowa data zapisania.' };
  }
  return { ok: true, data: { form, params, createdAt } };
}

function parseImportedDate(value: unknown, fallback: number): Date | null {
  const date =
    value === undefined
      ? new Date(fallback)
      : typeof value === 'string'
        ? new Date(value)
        : null;
  if (
    !date ||
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() < 1 ||
    date.getUTCFullYear() > 9999
  )
    return null;
  return date;
}
