const DEFAULT_SITE_URL = 'http://localhost:3000';

function normalize(value: string): string {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '');
}

export const siteUrl: string = process.env.SITE_URL
  ? normalize(process.env.SITE_URL)
  : DEFAULT_SITE_URL;
