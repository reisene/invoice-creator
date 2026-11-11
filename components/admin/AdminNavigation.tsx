'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BsGear } from 'react-icons/bs';

const adminLinks = [
  { href: '/admin' as const, label: 'Dashboard' },
  { href: '/admin/users' as const, label: 'Użytkownicy' },
  { href: '/admin/tax-params' as const, label: 'Parametry podatkowe' },
];

export default function AdminNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className='admin-fab-container'>
      {/* Menu z linkami */}
      <nav
        aria-label={'Nawigacja panelu admina'}
        className={`admin-fab-menu ${isOpen ? 'open' : 'closed'}`}
      >
        {adminLinks.map((link) => {
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`btn shadow-sm ${
                isActive ? 'btn-primary' : 'btn-light'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* FAB przycisk */}
      <button
        type='button'
        className='btn btn-primary rounded-circle shadow admin-fab'
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={'Panel admina'}
        aria-expanded={isOpen}
      >
        <BsGear fontSize={24} />
      </button>
    </div>
  );
}
