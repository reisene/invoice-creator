import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  claimPendingMagicLinkAcceptance,
  hasCurrentTermsAcceptance,
} from '@/lib/recordTermsAcceptance';
import {
  getSavedInvoicesForUser,
  getSavedPartiesForUser,
  getUserBankAccount,
} from '@/lib/savedDataAccess';
import { decryptJson } from '@/lib/savedDataCrypto';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) {
    return new Response('Zaloguj się, aby pobrać dane.', { status: 401 });
  }
  if (user.email) {
    await claimPendingMagicLinkAcceptance(user.id, user.email);
  }
  if (!(await hasCurrentTermsAcceptance(user.id))) {
    return new Response('Zaakceptuj aktualny Regulamin, aby pobrać dane.', {
      status: 403,
    });
  }
  const limit = await checkRateLimit('exportData', user.id);
  if (!limit.ok) return new Response(limit.message, { status: 429 });

  const [rawInvoices, parties, bankAccount, cookieConsent] = await Promise.all([
    getSavedInvoicesForUser(user.id),
    getSavedPartiesForUser(user.id),
    getUserBankAccount(user.id),
    prisma.cookieConsent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { choice: true, consentVersion: true, createdAt: true },
    }),
  ]);

  // Older invoices have no uid yet; assign one so re-importing detects them.
  const invoices = await Promise.all(
    rawInvoices.map(async (invoice) => {
      if (invoice.uid) return invoice;
      const uid = randomUUID();
      const { count } = await prisma.invoice.updateMany({
        where: { id: invoice.id, userId: user.id, uid: null },
        data: { uid },
      });
      if (count === 1) return { ...invoice, uid };
      const current = await prisma.invoice.findFirst({
        where: { id: invoice.id, userId: user.id },
        select: { uid: true },
      });
      return { ...invoice, uid: current?.uid ?? null };
    }),
  );

  const body = {
    version: 1,
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email },
    bankAccount,
    cookieConsent,
    invoices: invoices.map((invoice) => ({
      uid: invoice.uid,
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
