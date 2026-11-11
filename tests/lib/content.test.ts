// @vitest-environment node
import {
  getAdjacentArticles,
  getAllHelpArticles,
  getArticleBySlug,
  getCategoryArticles,
  HELP_ARTICLES,
} from '@/lib/helpArticles';
import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  articles: [
    {
      slug: ['podstawy', 'first'],
      slugPath: 'podstawy/first',
      title: 'First',
      description: 'First description',
      category: 'podstawy',
      order: 2,
      tags: ['one', 'two'],
      Content: () => null,
    },
    {
      slug: ['zus', 'second'],
      slugPath: 'zus/second',
      title: 'Second',
      description: '',
      category: 'zus',
      order: 1,
      tags: [],
      Content: () => null,
    },
    {
      slug: ['podstawy', 'another'],
      slugPath: 'podstawy/another',
      title: 'Another',
      description: '',
      category: 'podstawy',
      order: 2,
      tags: [],
      Content: () => null,
    },
  ],
  terms: [
    { version: 'old', effectiveDate: '2026-01-01', Content: () => null },
    { version: 'new', effectiveDate: '2026-05-01', Content: () => null },
  ],
  privacy: [
    { version: 'privacy-v1', effectiveDate: '2026-01-01', Content: () => null },
  ],
}));
vi.mock('@/content/help/registry.generated', () => ({
  helpArticleRegistry: mocks.articles,
}));
vi.mock('@/content/legal/registry.generated', () => ({
  legalDocumentRegistry: { terms: mocks.terms, privacy: mocks.privacy },
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('help content inventory', () => {
  it('uses the eagerly initialized registry without rebuilding the catalog', () => {
    expect(getAllHelpArticles()).toBe(HELP_ARTICLES);
    expect(getAllHelpArticles()).toBe(getAllHelpArticles());
    expect(HELP_ARTICLES).toHaveLength(mocks.articles.length);
  });
  it('preserves generated metadata and components and adds category labels', () => {
    expect(HELP_ARTICLES).toEqual([
      { ...mocks.articles[1], categoryLabel: 'Składki ZUS' },
      { ...mocks.articles[2], categoryLabel: 'Podstawy i prawo' },
      { ...mocks.articles[0], categoryLabel: 'Podstawy i prawo' },
    ]);
    expect(getArticleBySlug(['podstawy', 'first'])?.Content).toBe(
      mocks.articles[0].Content,
    );
  });
  it('looks up articles and previous/next boundaries by exact slug', () => {
    expect(getArticleBySlug(['podstawy', 'first'])?.title).toBe('First');
    expect(getArticleBySlug(['podstawy', 'first', 'extra'])).toBeUndefined();
    expect(getAdjacentArticles('podstawy/another')).toMatchObject({
      prev: { title: 'Second' },
      next: { title: 'First' },
    });
    expect(getAdjacentArticles('zus/second').prev).toBeUndefined();
    expect(getAdjacentArticles('podstawy/first').next).toBeUndefined();
    expect(getAdjacentArticles('missing')).toEqual({});
    expect(
      getCategoryArticles('podstawy').map((article) => article.title),
    ).toEqual(['Another', 'First']);
    expect(getCategoryArticles('aplikacja')).toEqual([]);
  });
  it('does not reorder or add category labels to the generated source entries', () => {
    expect(mocks.articles.map((article) => article.slugPath)).toEqual([
      'podstawy/first',
      'zus/second',
      'podstawy/another',
    ]);
    for (const article of mocks.articles) {
      expect(article).not.toHaveProperty('categoryLabel');
    }
  });
  it('sorts by numeric order with deterministic slug ordering for ties', () => {
    expect(getAllHelpArticles().map((article) => article.slugPath)).toEqual([
      'zus/second',
      'podstawy/another',
      'podstawy/first',
    ]);
  });
});

describe('effective legal documents in Warsaw time', () => {
  it('selects the latest effective version, not a future document', () => {
    expect(
      getCurrentLegalDocument('terms', new Date('2026-04-30T21:59:59Z'))
        .version,
    ).toBe('old');
    expect(
      getCurrentLegalDocument('terms', new Date('2026-04-30T22:00:00Z'))
        .version,
    ).toBe('new');
    expect(
      getCurrentLegalDocument('privacy', new Date('2026-05-01T00:00:00Z'))
        .version,
    ).toBe('privacy-v1');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T00:00:00Z'));
    expect(getCurrentLegalDocument('terms').version).toBe('new');
  });
  it('rejects dates before any configured document becomes effective', () => {
    expect(() =>
      getCurrentLegalDocument('terms', new Date('2025-12-01T00:00:00Z')),
    ).toThrow('No effective terms document');
  });
  it('fails explicitly if Intl cannot provide the Warsaw date parts', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue(
      [],
    );
    expect(() => getCurrentLegalDocument('terms')).toThrow(
      'Unable to determine Warsaw year.',
    );
  });
});
