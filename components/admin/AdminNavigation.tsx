import Link from 'next/link';

export default function AdminNavigation() {
  return (
    <nav
      aria-label={'Nawigacja panelu admina'}
      className={'flex-wrap gap-2 mb-4 d-flex'}
    >
      <Link href={'/admin' as const} className={'btn btn-outline-secondary'}>
        Dashboard
      </Link>
      <Link
        href={'/admin/users' as const}
        className={'btn btn-outline-secondary'}
      >
        Użytkownicy
      </Link>
      <Link
        href={'/admin/tax-params' as const}
        className={'btn btn-outline-secondary'}
      >
        Parametry podatkowe
      </Link>
    </nav>
  );
}
