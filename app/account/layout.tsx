import { getCurrentUserIdWithTerms } from '@/lib/currentUser';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userId = await getCurrentUserIdWithTerms();

  if (!userId) {
    redirect('/auth/sign-in');
  }

  return children;
}
