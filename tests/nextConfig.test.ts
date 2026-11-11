// @vitest-environment node
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@next/mdx', () => ({
  default: () => (config: unknown) => config,
}));
vi.mock('@sentry/nextjs/config', () => ({
  withSentryConfig: (config: unknown) => config,
}));
vi.mock('botid/next/config', () => ({
  withBotId: (config: unknown) => config,
}));

const { default: nextConfig } = await import('../next.config');

describe('admin response headers', () => {
  it('disables indexing and caching on the complete admin tree', async () => {
    const headers = await nextConfig.headers!();
    const adminRule = headers.find((rule) => rule.source === '/admin/:path*');
    expect(adminRule?.headers).toEqual([
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Cache-Control', value: 'private, no-store' },
    ]);
    expect(
      headers.find((rule) => rule.source === '/:path*')?.headers,
    ).toContainEqual({ key: 'X-Content-Type-Options', value: 'nosniff' });
  });

  it.each([
    ['/admin', true],
    ['/admin/', true],
    ['/admin/settings/users', true],
    ['/administrator', false],
    ['/account', false],
    ['/', false],
  ])('scopes the admin header pattern to %s: %s', async (url, expected) => {
    const response = await unstable_getResponseFromNextConfig({
      nextConfig,
      url: `https://example.com${url}`,
    });
    expect(response.headers.get('x-robots-tag')).toBe(
      expected ? 'noindex, nofollow' : null,
    );
    expect(response.headers.get('cache-control')).toBe(
      expected ? 'private, no-store' : null,
    );
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
