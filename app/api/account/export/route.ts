import { auth } from '@/lib/auth/server';
import {
  getSavedInvoicesForUser,
  getSavedPartiesForUser,
} from '@/lib/savedDataAccess';
import { decryptJson } from '@/lib/savedDataCrypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const [invoices, parties] = await Promise.all([
    getSavedInvoicesForUser(user.id),
    getSavedPartiesForUser(user.id),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      contractNumber: invoice.contractNumber,
      updatedAt: invoice.updatedAt,
      data: decryptJson(invoice.data).data,
    })),
    parties: parties.map((party) => ({
      kind: party.kind,
      clientType: party.clientType,
      name: party.name,
      address: party.address,
      nip: party.nip,
      pesel: party.pesel,
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="moje-dane.json"',
      'Cache-Control': 'no-store',
    },
  });
}
