import { getContactMessageRetentionCutoff } from '@/lib/contactMessageRetention';
import { getCookieConsentLogCutoff } from '@/lib/cookieConsent';
import { prisma } from '@/lib/db';
import { getPendingMagicLinkAcceptanceCutoff } from '@/lib/recordTermsAcceptance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/contact-retention] CRON_SECRET is not configured.');
    return Response.json(
      { error: 'Scheduled job is not configured.' },
      { status: 503 },
    );
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const [contactMessages, pendingTermsAcceptances, cookieConsentLogs] =
    await Promise.all([
      prisma.contactMessage.deleteMany({
        where: {
          createdAt: { lt: getContactMessageRetentionCutoff() },
        },
      }),
      prisma.termsAcceptance.deleteMany({
        where: {
          userId: null,
          registrationMethod: 'MAGIC_LINK',
          acceptedAt: { lt: getPendingMagicLinkAcceptanceCutoff() },
        },
      }),
      prisma.cookieConsent.deleteMany({
        where: {
          createdAt: { lt: getCookieConsentLogCutoff() },
        },
      }),
    ]);

  return Response.json({
    deletedCount: contactMessages.count,
    deletedPendingTermsAcceptances: pendingTermsAcceptances.count,
    deletedCookieConsentLogs: cookieConsentLogs.count,
  });
}
