import { getCurrentUserIdWithTerms } from '@/lib/currentUser';
import { redirect } from 'next/navigation';

export default async function TermsCheckPage() {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) {
    redirect('/auth/sign-in');
  }

  redirect('/');
}
