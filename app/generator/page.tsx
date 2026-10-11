import GeneratorClient from '@/components/generator/GeneratorClient';
import { getCurrentUserId } from '@/lib/currentUser';
import {
  getSavedInvoiceForUser,
  getSavedPartiesForUser,
} from '@/lib/savedDataAccess';
import { getAllTaxParams } from '@/lib/taxParams';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { SavedPartyDto } from '@/types/savedData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GeneratorPageProps {
  searchParams: Promise<{ invoice?: string | string[] }>;
}

export default async function GeneratorPage({
  searchParams,
}: GeneratorPageProps) {
  const [taxParams, userId, { invoice: invoiceId }] = await Promise.all([
    getAllTaxParams(),
    getCurrentUserId(),
    searchParams,
  ]);

  let parties: SavedPartyDto[] = [];
  let initialInvoice:
    { id: string; invoiceNumber: string; data: InvoiceFormData } | undefined;

  if (userId) {
    parties = await getSavedPartiesForUser(userId);

    if (typeof invoiceId === 'string' && invoiceId.length <= 100) {
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
      key={initialInvoice?.id ?? 'new'}
      taxParams={taxParams}
      signedIn={Boolean(userId)}
      initialParties={parties}
      initialInvoice={initialInvoice}
    />
  );
}
