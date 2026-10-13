import HelpIndexClient from '@/app/help/HelpIndexClient';
import { getAllHelpArticles } from '@/lib/helpArticles';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pomoc i Baza Wiedzy – Umowa Zlecenia, ZUS i PIT',
  description:
    'Kompendium wiedzy o umowach zlecenia w 2026 roku: zasady wystawiania rachunku, składki ZUS, ulga dla studentów, koszty 20% i 50% oraz oświadczenie PIT-2.',
  alternates: {
    canonical: '/help',
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    title: 'Pomoc i Baza Wiedzy – Umowa Zlecenia, ZUS i PIT',
    description:
      'Kompendium wiedzy o umowach zlecenia w 2026 roku: zasady wystawiania rachunku, składki ZUS, ulga dla studentów, koszty 20% i 50% oraz oświadczenie PIT-2.',
    url: '/help',
  },
};

export default function HelpPage() {
  const articles = getAllHelpArticles();
  return <HelpIndexClient articles={articles} />;
}
