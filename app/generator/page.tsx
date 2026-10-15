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
    { id: string; invoiceNumber: string; data: InvoiceFormData } | undefined;

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
          data: saved.data,
        };
      }
    }
  }

  return (
    <GeneratorClient
      key={initialInvoice?.id ?? (duplicateId ? `dup-${duplicateId}` : 'new')}
      taxParams={taxParams}
      signedIn={Boolean(userId)}
      initialParties={parties}
      bankAccount={bankAccount}
      initialInvoice={initialInvoice}
      duplicateData={duplicateData}
    />
  );
}
