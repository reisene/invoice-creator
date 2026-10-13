const DEFAULT_SITE_URL = 'http://localhost:3000';

function normalize(value: string): string {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '');
}

export const siteUrl: string =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
    ? normalize(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL!)
    : DEFAULT_SITE_URL;

export function getSiteDisplayUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (rawUrl) {
    try {
      const parsed = new URL(normalize(rawUrl));
      return parsed.host;
    } catch {
      return rawUrl;
    }
  }
  return 'github.com/reisene/invoice-creator';
}
