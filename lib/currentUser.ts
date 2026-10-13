import 'server-only';

import { auth } from '@/lib/auth/server';
import {
  claimPendingMagicLinkAcceptance,
  hasCurrentTermsAcceptance,
} from '@/lib/recordTermsAcceptance';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

export async function getCurrentUserId(): Promise<string | null> {
  const { data: session } = await auth.getSession();
  return session?.user?.id ?? null;
}

export async function getCurrentUserIdWithTerms(): Promise<string | null> {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.id) return null;

  if (user.email) {
    await claimPendingMagicLinkAcceptance(user.id, user.email);
  }

  if (!(await hasCurrentTermsAcceptance(user.id))) {
    redirect('/terms/accept' as Route);
  }

  return user.id;
}
