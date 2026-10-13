export interface HelpArticleMeta {
  slug: string[];
  slugPath: string;
  title: string;
  description: string;
  category: 'podstawy' | 'zus' | 'podatki' | 'aplikacja';
  categoryLabel: string;
  order: number;
  tags: string[];
}

export interface HelpCategoryMeta {
  id: 'podstawy' | 'zus' | 'podatki' | 'aplikacja';
  name: string;
  description: string;
  iconName: string;
}

export const HELP_CATEGORIES: HelpCategoryMeta[] = [
  {
    id: 'podstawy',
    name: 'Podstawy i prawo',
    description: 'Zasady zawierania umów zlecenia, terminy i stawki minimalne.',
    iconName: 'BsFileText',
  },
  {
    id: 'zus',
    name: 'Składki ZUS',
    description:
      'Zbieg tytułów, ubezpieczenie studentów i dobrowolne chorobowe.',
    iconName: 'BsShieldCheck',
  },
  {
    id: 'podatki',
    name: 'Podatki i koszty PIT',
    description: 'Koszty 20% i 50%, kwota wolna (PIT-2) oraz ulga dla młodych.',
    iconName: 'BsPercent',
  },
  {
    id: 'aplikacja',
    name: 'Generator i eksport',
    description: 'Tworzenie i pobieranie dokumentu PDF, prywatność danych.',
    iconName: 'BsLaptop',
  },
];
