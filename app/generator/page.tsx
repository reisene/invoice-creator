import GeneratorClient from '@/components/generator/GeneratorClient';
import { getCurrentUserId } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import { sanitizeInvoiceForm } from '@/lib/sanitizeInvoiceForm';
import { getAllTaxParams } from '@/lib/taxParams';
import type { SavedPartyDto } from '@/types/savedData';

export const dynamic = 'force-dynamic';

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
    | { id: string; data: NonNullable<ReturnType<typeof sanitizeInvoiceForm>> }
    | undefined;

  if (userId) {
    parties = (await prisma.savedParty.findMany({
      where: { userId },
      orderBy: { label: 'asc' },
      select: {
        id: true,
        kind: true,
        label: true,
        clientType: true,
        name: true,
        address: true,
        nip: true,
        pesel: true,
      },
    })) as SavedPartyDto[];

    if (typeof invoiceId === 'string' && invoiceId.length <= 100) {
      const saved = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId },
        select: { id: true, data: true },
      });
      const data = saved ? sanitizeInvoiceForm(saved.data) : null;
      if (saved && data) initialInvoice = { id: saved.id, data };
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
