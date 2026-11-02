import { HELP_CATEGORIES, type HelpArticleMeta } from '@/types/help';
import matter from 'gray-matter';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type HelpCategory = HelpArticleMeta['category'];

type HelpArticleSource = Omit<HelpArticleMeta, 'categoryLabel'> & {
  importPath: string;
};

type RegisteredHelpArticle = HelpArticleSource & {
  importName: string;
};

const helpDirectory = path.join(process.cwd(), 'content', 'help');
const registryPath = path.join(helpDirectory, 'registry.generated.ts');

function isHelpCategory(value: string): value is HelpCategory {
  return HELP_CATEGORIES.some(({ id }) => id === value);
}

async function readArticles(): Promise<RegisteredHelpArticle[]> {
  const entries = await readdir(helpDirectory, { withFileTypes: true });
  const articles: HelpArticleSource[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    if (!isHelpCategory(entry.name)) {
      throw new Error(`Unknown help-article category directory: ${entry.name}`);
    }

    const category = entry.name;
    const files = await readdir(path.join(helpDirectory, category), {
      withFileTypes: true,
    });

    for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!file.isFile()) continue;
      if (file.name.endsWith('.md')) {
        throw new Error(
          `${path.join(category, file.name)} must use the .mdx extension.`,
        );
      }
      if (!file.name.endsWith('.mdx')) continue;

      const filePath = path.join(helpDirectory, category, file.name);
      const { data } = matter(await readFile(filePath, 'utf8'));
      const baseName = file.name.slice(0, -'.mdx'.length);

      if (typeof data.title !== 'string' || !data.title.trim()) {
        throw new Error(`${filePath} must define a non-empty title.`);
      }
      if (typeof data.description !== 'string') {
        throw new Error(`${filePath} must define a string description.`);
      }
      if (data.category !== category) {
        throw new Error(
          `${filePath} must use its directory name as its category.`,
        );
      }
      if (typeof data.order !== 'number' || !Number.isFinite(data.order)) {
        throw new Error(`${filePath} must define a finite numeric order.`);
      }
      if (
        !Array.isArray(data.tags) ||
        !data.tags.every((tag: unknown) => typeof tag === 'string')
      ) {
        throw new Error(`${filePath} must define an array of string tags.`);
      }

      const slug = [category, baseName];
      articles.push({
        slug,
        slugPath: slug.join('/'),
        title: data.title,
        description: data.description,
        category,
        order: data.order,
        tags: data.tags,
        importPath: `./${category}/${file.name}`,
      });
    }
  }

  if (articles.length === 0) {
    throw new Error(`No MDX help articles found in ${helpDirectory}.`);
  }

  const slugs = new Set<string>();
  for (const article of articles) {
    if (slugs.has(article.slugPath)) {
      throw new Error(`Duplicate help-article slug: ${article.slugPath}.`);
    }
    slugs.add(article.slugPath);
  }

  return articles
    .sort((a, b) => a.order - b.order || a.slugPath.localeCompare(b.slugPath))
    .map((article, index): RegisteredHelpArticle => ({
      ...article,
      importName: `helpArticle${index}`,
    }));
}

async function main() {
  const articles = await readArticles();
  const imports = [
    `import type { ComponentType } from 'react';`,
    `import type { HelpArticleMeta } from '@/types/help';`,
    ...articles.map(
      ({ importName, importPath }) =>
        `import ${importName} from ${JSON.stringify(importPath)};`,
    ),
  ];
  const entries = articles.map(
    ({
      slug,
      slugPath,
      title,
      description,
      category,
      order,
      tags,
      importName,
    }) =>
      [
        '  {',
        `    slug: ${JSON.stringify(slug)},`,
        `    slugPath: ${JSON.stringify(slugPath)},`,
        `    title: ${JSON.stringify(title)},`,
        `    description: ${JSON.stringify(description)},`,
        `    category: ${JSON.stringify(category)},`,
        `    order: ${order},`,
        `    tags: ${JSON.stringify(tags)},`,
        `    Content: ${importName},`,
        '  },',
      ].join('\n'),
  );
  const output = `${imports.join('\n')}\n\ntype HelpArticleRegistryEntry = Omit<HelpArticleMeta, 'categoryLabel'> & {\n  Content: ComponentType;\n};\n\nexport const helpArticleRegistry: HelpArticleRegistryEntry[] = [\n${entries.join('\n')}\n];\n`;

  await writeFile(registryPath, output, 'utf8');
}

main().catch((error: unknown) => {
  console.error('Failed to generate the help-article registry.', error);
  process.exitCode = 1;
});
