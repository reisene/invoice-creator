import 'server-only';

import { prisma } from '@/lib/db';
import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import type { RegistrationConsent } from '@/lib/legal/termsAcceptance';

const PENDING_MAGIC_LINK_RETENTION_DAYS = 30;

export function getPendingMagicLinkAcceptanceCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - PENDING_MAGIC_LINK_RETENTION_DAYS);
  return cutoff;
}

export async function recordTermsAcceptance(
  consent: RegistrationConsent,
  userId?: string,
): Promise<void> {
  const acceptedAt = new Date();

  if (!userId && consent.registrationMethod !== 'MAGIC_LINK') {
    throw new Error('An authenticated user is required to record acceptance.');
  }

  if (userId) {
    await prisma.termsAcceptance.upsert({
      where: {
        userId_termsVersion: {
          userId,
          termsVersion: consent.termsVersion,
        },
      },
      create: {
        ...consent,
        email: consent.email.toLowerCase(),
        userId,
        termsVersion: consent.termsVersion,
        acceptedAt,
        earlyServiceStartRequestedAt: consent.earlyServiceStartRequested
          ? acceptedAt
          : null,
      },
      update: {},
    });
    return;
  }

  await prisma.termsAcceptance.create({
    data: {
      ...consent,
      email: consent.email.toLowerCase(),
      termsVersion: consent.termsVersion,
      acceptedAt,
      earlyServiceStartRequestedAt: consent.earlyServiceStartRequested
        ? acceptedAt
        : null,
    },
  });
}

export async function claimPendingMagicLinkAcceptance(
  userId: string,
  email: string,
): Promise<void> {
  const termsVersion = getCurrentLegalDocument('terms').version;
  if (await hasCurrentTermsAcceptance(userId)) return;

  const pending = await prisma.termsAcceptance.findFirst({
    where: {
      userId: null,
      email: email.trim().toLowerCase(),
      termsVersion,
      registrationMethod: 'MAGIC_LINK',
      accountDeletionRequestedAt: null,
      acceptedAt: { gte: getPendingMagicLinkAcceptanceCutoff() },
    },
    orderBy: { acceptedAt: 'desc' },
    select: { id: true },
  });

  if (!pending) return;

  try {
    await prisma.termsAcceptance.updateMany({
      where: {
        id: pending.id,
        userId: null,
        accountDeletionRequestedAt: null,
      },
      data: {
        userId,
      },
    });
  } catch (error) {
    if (await hasCurrentTermsAcceptance(userId)) return;
    throw error;
  }
}

export async function hasCurrentTermsAcceptance(
  userId: string,
): Promise<boolean> {
  const termsVersion = getCurrentLegalDocument('terms').version;
  const acceptance = await prisma.termsAcceptance.findUnique({
    where: {
      userId_termsVersion: { userId, termsVersion },
    },
  });

  return acceptance !== null;
}
