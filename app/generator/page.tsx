import GeneratorClient from '@/components/generator/GeneratorClient';
import { getCurrentUserIdWithTerms } from '@/lib/currentUser';
import { getAllTaxParams } from '@/lib/invoice/taxParams';
import {
  getSavedInvoiceForUser,
  getSavedPartiesForUser,
  getUserBankAccount,
} from '@/lib/savedDataAccess';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { SavedPartyDto } from '@/types/savedData';
import type { Metadata } from 'next';
import { createHash } from 'node:crypto';

export const metadata: Metadata = { title: 'Generator rachunku' };

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GeneratorPageProps {
  searchParams: Promise<{
    invoice?: string | string[];
    duplicate?: string | string[];
  }>;
}

export default async function GeneratorPage({
  searchParams,
}: GeneratorPageProps) {
  const [taxParams, userId, { invoice: invoiceId, duplicate: duplicateId }] =
    await Promise.all([
      getAllTaxParams(),
      getCurrentUserIdWithTerms(),
      searchParams,
    ]);

  let parties: SavedPartyDto[] = [];
  let bankAccount = null;
  let duplicateData: InvoiceFormData | undefined;
  let initialInvoice:
    | {
        id: string;
        invoiceNumber: string;
        updatedAt: string;
        data: InvoiceFormData;
      }
    | undefined;

  if (userId) {
    [parties, bankAccount] = await Promise.all([
      getSavedPartiesForUser(userId),
      getUserBankAccount(userId),
    ]);

    if (typeof duplicateId === 'string' && duplicateId.length <= 100) {
      duplicateData =
        (await getSavedInvoiceForUser(userId, duplicateId))?.data ?? undefined;
    } else if (typeof invoiceId === 'string' && invoiceId.length <= 100) {
      const saved = await getSavedInvoiceForUser(userId, invoiceId);
      if (saved?.data) {
        initialInvoice = {
          id: saved.id,
          invoiceNumber: saved.invoiceNumber,
          updatedAt: saved.updatedAt,
          data: saved.data,
        };
      }
    }
  }

  const draftScope = userId
    ? createHash('sha256').update(userId).digest('hex')
    : 'anonymous';
  const draftContext =
    typeof duplicateId === 'string' && duplicateId.length <= 100
      ? `duplicate:${duplicateId}`
      : typeof invoiceId === 'string' && invoiceId.length <= 100
        ? `invoice:${invoiceId}`
        : 'new';

  return (
    <GeneratorClient
      key={`${draftScope}:${draftContext}`}
      taxParams={taxParams}
      signedIn={Boolean(userId)}
      draftScope={draftScope}
      draftContext={draftContext}
      initialParties={parties}
      bankAccount={bankAccount}
      initialInvoice={initialInvoice}
      duplicateData={duplicateData}
    />
  );
}
