import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/db';
import { sanitizeInvoiceForm } from '@/lib/invoice/sanitizeInvoiceForm';
import { decryptJson } from '@/lib/savedDataCrypto';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { ActionResult } from '@/types/savedData';
import type { TaxParams } from '@/types/taxParams';
import 'server-only';
import {
  getPreviousInvoiceTaxableIncome,
  type InvoiceIncomeEntry,
} from './invoiceIncome';

type InvoiceReader = Pick<Prisma.TransactionClient, 'invoice'>;

interface CurrentInvoice {
  id: string;
  uid: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getSavedInvoiceIncome(
  userId: string,
  target: Pick<InvoiceFormData, 'periodStart' | 'contractorPesel'>,
  taxParams: TaxParams,
  invoiceId?: string,
  db: InvoiceReader = prisma,
): Promise<
  | ActionResult<{
      income: number;
      current: CurrentInvoice | null;
      latestSamePeriod: Date | null;
    }>
  | { ok: false; error: string; invoiceChanged: true }
> {
  const current = invoiceId
    ? await db.invoice.findFirst({
        where: { id: invoiceId, userId },
        select: {
          id: true,
          uid: true,
          invoiceNumber: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : null;
  if (invoiceId && !current) {
    return {
      ok: false,
      error: 'Nie znaleziono rachunku.',
      invoiceChanged: true,
    };
  }

  const year = target.periodStart.slice(0, 4);
  const savedInvoices = await db.invoice.findMany({
    where: {
      userId,
      periodStart: { gte: `${year}-01-01`, lte: target.periodStart },
      ...(invoiceId ? { id: { not: invoiceId } } : {}),
    },
    select: {
      id: true,
      uid: true,
      createdAt: true,
      periodStart: true,
      data: true,
    },
  });

  const entries: InvoiceIncomeEntry[] = [];
  let latestSamePeriod: Date | null = null;
  for (const savedInvoice of savedInvoices) {
    const form = sanitizeInvoiceForm(decryptJson(savedInvoice.data).data);
    if (!form || form.periodStart !== savedInvoice.periodStart) {
      return {
        ok: false,
        error:
          'Nie udało się odczytać jednego z zapisanych rachunków. Popraw lub usuń ten rachunek, aby wyliczyć dochód roczny.',
      };
    }
    entries.push({
      id: savedInvoice.id,
      uid: savedInvoice.uid,
      createdAt: savedInvoice.createdAt,
      form,
    });
    if (
      form.periodStart === target.periodStart &&
      (!latestSamePeriod || savedInvoice.createdAt > latestSamePeriod)
    ) {
      latestSamePeriod = savedInvoice.createdAt;
    }
  }

  return {
    ok: true,
    data: {
      income: getPreviousInvoiceTaxableIncome(
        entries,
        {
          ...target,
          id: current?.id,
          uid: current?.uid,
          createdAt: current?.createdAt,
        },
        taxParams,
      ),
      current,
      latestSamePeriod,
    },
  };
}
