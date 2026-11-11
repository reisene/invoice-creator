import AdminNavigation from '@/components/admin/AdminNavigation';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from 'react-bootstrap';

export const metadata: Metadata = {
  title: {
    default: 'Panel administratora',
    template: '%s | Panel administratora',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <Container className='py-4'>
      <AdminNavigation />
      {children}
    </Container>
  );
}
