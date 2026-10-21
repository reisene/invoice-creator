import { getAllHelpArticles } from '@/lib/helpArticles';
import { siteUrl } from '@/lib/siteUrl';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const helpUrls: MetadataRoute.Sitemap = getAllHelpArticles().map(
    (article) => ({
      url: `${siteUrl}/help/${article.slugPath}`,
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
  );

  return [
    { url: `${siteUrl}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${siteUrl}/generator`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/preview`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/help`, changeFrequency: 'monthly', priority: 0.8 },
    ...helpUrls,
    { url: `${siteUrl}/contact`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
