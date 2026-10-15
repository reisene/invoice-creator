'use client';

import type { Route } from 'next';
import Link from 'next/link';

export default function CookieSettingsButton() {
  return (
    <Link
      className='text-decoration-none text-reset small'
      href={'/cookies' as Route}
    >
      Ustawienia cookies
    </Link>
  );
}
