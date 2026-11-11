import 'server-only';

import { hasAdminRole } from '@/lib/auth/roles';
import { auth } from '@/lib/auth/server';
import { logServerError } from '@/lib/serverLogger';
import { redirect } from 'next/navigation';

export async function requireAdmin() {
  const { data: session, error } = await auth.getSession();

  if (error) {
    logServerError('admin.requireAdmin', error);
    throw new Error('Nie można zweryfikować sesji administratora.');
  }

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  if (!hasAdminRole(session.user.role)) {
    throw new Error('Brak uprawnień administratora.');
  }

  return session.user;
}
