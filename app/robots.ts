import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isProduction: boolean = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: ['/'],
      },
      sitemap: 'https://invoice-creator.vercel.app/sitemap.xml',
    };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://invoice-creator.vercel.app/sitemap.xml',
  };
}
