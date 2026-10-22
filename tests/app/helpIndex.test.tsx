// @vitest-environment node
import HelpIndexClient from '@/app/help/HelpIndexClient';
import { HELP_CATEGORIES, type HelpArticleMeta } from '@/types/help';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './dom';
import { testing } from './dom';

const { cleanup, fireEvent, render, screen } = testing;
const mocks = vi.hoisted(() => ({ category: null as string | null }));
vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(mocks.category ? { category: mocks.category } : {}),
}));

const articles: HelpArticleMeta[] = HELP_CATEGORIES.map((category, index) => ({
  slug: [category.id, 'article'],
  slugPath: `${category.id}/article`,
  title: `Article ${index}`,
  description: `Description ${index}`,
  category: category.id,
  categoryLabel: category.name,
  order: index,
  tags: [`tag${index}`],
}));
beforeEach(() => {
  mocks.category = null;
});
afterEach(cleanup);

describe('help article filters', () => {
  it('shows every article and links to article, generator and preview pages', () => {
    render(<HelpIndexClient articles={articles} />);
    for (const article of articles) {
      expect(
        screen.getByRole('link', { name: article.title }).getAttribute('href'),
      ).toBe(`/help/${article.slugPath}`);
    }
    expect(
      screen
        .getByRole('link', { name: /Otwórz generator/ })
        .getAttribute('href'),
    ).toBe('/generator');
    expect(
      screen
        .getByRole('link', { name: 'Zobacz wzorce rachunków' })
        .getAttribute('href'),
    ).toBe('/preview');
  });

  it('initializes from the category URL parameter and switches categories', () => {
    mocks.category = 'zus';
    render(<HelpIndexClient articles={articles} />);
    expect(screen.getByRole('link', { name: 'Article 1' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Article 0' })).toBeNull();
    for (const category of HELP_CATEGORIES) {
      fireEvent.click(
        screen.getByRole('button', { name: `${category.name}1` }),
      );
      expect(
        screen.getByRole('link', {
          name: articles.find((a) => a.category === category.id)!.title,
        }),
      ).toBeDefined();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Wszystkie (4)' }));
    expect(screen.getAllByRole('heading', { level: 5 })).toHaveLength(4);
  });

  it.each([' ARTICLE 2 ', 'DESCRIPTION 2', 'TAG2'])(
    'searches title, description and tags case-insensitively: %s',
    (query) => {
      render(<HelpIndexClient articles={articles} />);
      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: query },
      });
      expect(screen.getByRole('link', { name: 'Article 2' })).toBeDefined();
      expect(screen.queryByRole('link', { name: 'Article 0' })).toBeNull();
      fireEvent.click(
        screen.getByRole('button', { name: 'Wyczyść wyszukiwanie' }),
      );
      expect(screen.getAllByRole('heading', { level: 5 })).toHaveLength(4);
    },
  );

  it('ignores whitespace and clears both filters after an empty result', () => {
    mocks.category = 'zus';
    render(<HelpIndexClient articles={articles} />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: '   ' },
    });
    expect(screen.getByRole('link', { name: 'Article 1' })).toBeDefined();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Article 0' },
    });
    expect(screen.getByText(/Nie znaleziono artykułów/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść filtry' }));
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('');
    expect(screen.getAllByRole('heading', { level: 5 })).toHaveLength(4);
  });

  it('handles an empty article catalog', () => {
    render(<HelpIndexClient articles={[]} />);
    expect(screen.getByText(/Nie znaleziono artykułów/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Wszystkie (0)' })).toBeDefined();
  });
});
