import UserList from '@/components/admin/UserList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Użytkownicy',
};

export default function AdminUsersPage() {
  return (
    <>
      <div className='mb-4'>
        <h1 className='mb-2'>Użytkownicy</h1>
        <p className='text-body-secondary mb-0'>
          Zarządzaj użytkownikami, banuj i odblokowuj konta.
        </p>
      </div>
      <UserList />
    </>
  );
}
