import { helpArticleRegistry } from '@/content/help/registry.generated';
import {
  HELP_CATEGORIES,
  type HelpArticleMeta,
  type HelpCategoryMeta,
} from '@/types/help';
import type { ComponentType } from 'react';

export { HELP_CATEGORIES, type HelpArticleMeta, type HelpCategoryMeta };

export interface HelpArticle extends HelpArticleMeta {
  Content: ComponentType;
}

const CATEGORY_LABELS: Record<HelpArticleMeta['category'], string> = {
  podstawy: 'Podstawy i prawo',
  zus: 'Składki ZUS',
  podatki: 'Podatki i koszty PIT',
  aplikacja: 'Generator i eksport',
};

export const HELP_ARTICLES: HelpArticle[] = helpArticleRegistry
  .map((article) => ({
    ...article,
    categoryLabel: CATEGORY_LABELS[article.category],
  }))
  .sort((a, b) => a.order - b.order || a.slugPath.localeCompare(b.slugPath));

export function getAllHelpArticles(): HelpArticle[] {
  return HELP_ARTICLES;
}

export function getArticleBySlug(slug: string[]): HelpArticle | undefined {
  const path = slug.join('/');
  return getAllHelpArticles().find((a) => a.slugPath === path);
}

export function getAdjacentArticles(slugPath: string): {
  prev?: HelpArticle;
  next?: HelpArticle;
} {
  const sorted = getAllHelpArticles();
  const index = sorted.findIndex((a) => a.slugPath === slugPath);
  if (index === -1) return {};

  return {
    prev: sorted[index - 1],
    next: sorted[index + 1],
  };
}

export function getCategoryArticles(
  category: HelpArticleMeta['category'],
): HelpArticle[] {
  return getAllHelpArticles().filter((a) => a.category === category);
}
