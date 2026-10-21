import { siteUrl } from '@/lib/siteUrl';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  if (process.env.NODE_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account', '/auth', '/api'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
