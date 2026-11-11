import Link from 'next/link';

const adminNavigationsLinks = [
  {
    href: '/admin' as const,
    label: 'Dashboard',
  },
  {
    href: '/admin/tax-params' as const,
    label: 'Parametry podatkowe',
  },
];

export default function AdminNavigation() {
  return (
    <nav
      aria-label={'Nawigacja panelu admina'}
      className={'flex-wrap gap-2 mb-4 d-flex'}
    >
      {adminNavigationsLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={'btn btn-outline-secondary'}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
