import {
  HELP_CATEGORIES,
  type HelpArticleMeta,
  type HelpCategoryMeta,
} from '@/types/help';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

export { HELP_CATEGORIES, type HelpArticleMeta, type HelpCategoryMeta };

const CATEGORY_LABELS: Record<HelpArticleMeta['category'], string> = {
  podstawy: 'Podstawy i prawo',
  zus: 'Składki ZUS',
  podatki: 'Podatki i koszty PIT',
  aplikacja: 'Generator i eksport',
};

export function getAllHelpArticles(): HelpArticleMeta[] {
  const contentDir = path.join(process.cwd(), 'content', 'help');
  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const articles: HelpArticleMeta[] = [];
  const categories = fs.readdirSync(contentDir);

  for (const category of categories) {
    const categoryPath = path.join(contentDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath);
    for (const file of files) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;

      const filePath = path.join(categoryPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);

      const baseName = file.replace(/\.mdx?$/, '');
      const cat = category as HelpArticleMeta['category'];

      articles.push({
        slug: [category, baseName],
        slugPath: `${category}/${baseName}`,
        title: (data.title as string) || baseName,
        description: (data.description as string) || '',
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat] || category,
        order: typeof data.order === 'number' ? data.order : 99,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      });
    }
  }

  return articles.sort((a, b) => a.order - b.order);
}

export const HELP_ARTICLES: HelpArticleMeta[] = getAllHelpArticles();

export function getArticleBySlug(slug: string[]): HelpArticleMeta | undefined {
  const path = slug.join('/');
  return getAllHelpArticles().find((a) => a.slugPath === path);
}

export function getAdjacentArticles(slugPath: string): {
  prev?: HelpArticleMeta;
  next?: HelpArticleMeta;
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
): HelpArticleMeta[] {
  return getAllHelpArticles()
    .filter((a) => a.category === category)
    .sort((a, b) => a.order - b.order);
}
