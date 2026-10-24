// @vitest-environment node
import {
  getAdjacentArticles,
  getAllHelpArticles,
  getArticleBySlug,
  getCategoryArticles,
  HELP_ARTICLES,
} from '@/lib/helpArticles';
import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  read: vi.fn(),
  list: vi.fn(),
  stat: vi.fn(),
  terms: [
    { version: 'old', effectiveDate: '2026-01-01', Content: () => null },
    { version: 'new', effectiveDate: '2026-05-01', Content: () => null },
  ],
  privacy: [
    { version: 'privacy-v1', effectiveDate: '2026-01-01', Content: () => null },
  ],
}));
vi.mock('fs', () => ({
  default: {
    existsSync: mocks.exists,
    readFileSync: mocks.read,
    readdirSync: mocks.list,
    statSync: mocks.stat,
  },
}));
vi.mock('@/content/legal/registry.generated', () => ({
  legalDocumentRegistry: { terms: mocks.terms, privacy: mocks.privacy },
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.exists.mockReturnValue(true);
  mocks.list.mockImplementation((directory: string) => {
    if (directory === path.join(process.cwd(), 'content', 'help'))
      return ['README.txt', 'podstawy', 'zus', 'custom'];
    if (directory.endsWith('podstawy')) return ['first.mdx', 'ignored.png'];
    if (directory.endsWith('zus')) return ['second.md'];
    return ['fallback.mdx'];
  });
  mocks.stat.mockImplementation((directory: string) => ({
    isDirectory: () => !directory.endsWith('README.txt'),
  }));
  mocks.read.mockImplementation((filename: string) => {
    if (filename.endsWith('first.mdx'))
      return '---\ntitle: First\ndescription: First description\norder: 2\ntags: [one, two]\n---\nContent';
    if (filename.endsWith('second.md'))
      return '---\ntitle: Second\norder: 1\n---\nContent';
    return '---\norder: not-a-number\ntags: not-an-array\n---\nContent';
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('help content inventory', () => {
  it('handles missing directories, including the eagerly initialized article constant', () => {
    expect(HELP_ARTICLES).toEqual([]);
    mocks.exists.mockReturnValue(false);
    expect(getAllHelpArticles()).toEqual([]);
    expect(getAdjacentArticles('missing')).toEqual({});
  });
  it('reads Markdown and MDX frontmatter, skips other entries and sorts by order', () => {
    expect(getAllHelpArticles()).toEqual([
      {
        slug: ['zus', 'second'],
        slugPath: 'zus/second',
        title: 'Second',
        description: '',
        category: 'zus',
        categoryLabel: 'Składki ZUS',
        order: 1,
        tags: [],
      },
      {
        slug: ['podstawy', 'first'],
        slugPath: 'podstawy/first',
        title: 'First',
        description: 'First description',
        category: 'podstawy',
        categoryLabel: 'Podstawy i prawo',
        order: 2,
        tags: ['one', 'two'],
      },
      {
        slug: ['custom', 'fallback'],
        slugPath: 'custom/fallback',
        title: 'fallback',
        description: '',
        category: 'custom',
        categoryLabel: 'custom',
        order: 99,
        tags: [],
      },
    ]);
    expect(mocks.read).toHaveBeenCalledTimes(3);
  });
  it('looks up articles and previous/next boundaries by exact slug', () => {
    expect(getArticleBySlug(['podstawy', 'first'])?.title).toBe('First');
    expect(getArticleBySlug(['missing'])).toBeUndefined();
    expect(getAdjacentArticles('podstawy/first')).toMatchObject({
      prev: { title: 'Second' },
      next: { title: 'fallback' },
    });
    expect(getAdjacentArticles('zus/second').prev).toBeUndefined();
    expect(getAdjacentArticles('custom/fallback').next).toBeUndefined();
    expect(getAdjacentArticles('missing')).toEqual({});
    expect(
      getCategoryArticles('podstawy').map((article) => article.title),
    ).toEqual(['First']);
    expect(getCategoryArticles('aplikacja')).toEqual([]);
  });
  it('propagates file read failures rather than reporting an empty successful catalog', () => {
    const error = new Error('unreadable');
    mocks.read.mockImplementation(() => {
      throw error;
    });
    expect(() => getAllHelpArticles()).toThrow(error);
  });
  it('sorts multiple articles within one category by their numeric order', () => {
    mocks.list.mockImplementation((directory: string) =>
      directory === path.join(process.cwd(), 'content', 'help')
        ? ['podstawy']
        : ['first.mdx', 'second.md'],
    );
    expect(
      getCategoryArticles('podstawy').map((article) => article.title),
    ).toEqual(['Second', 'First']);
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
