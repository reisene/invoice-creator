// @vitest-environment node
import { legalDocumentRegistry } from '@/content/legal/registry.generated';
import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import { compile } from '@mdx-js/mdx';
import { readFile } from 'node:fs/promises';
import remarkFrontmatter from 'remark-frontmatter';
import { describe, expect, it } from 'vitest';

describe('published legal documents and inactive drafts', () => {
  it('retains the historical privacy policy and selects the update on its effective Warsaw date', () => {
    expect(
      getCurrentLegalDocument('privacy', new Date('2026-10-24T21:59:59Z'))
        .version,
    ).toBe('1-beta');
    expect(
      getCurrentLegalDocument('privacy', new Date('2026-10-24T22:00:00Z'))
        .version,
    ).toBe('2-beta');
    expect(
      legalDocumentRegistry.privacy.map((document) => document.version),
    ).toEqual(['1-beta', '2-beta']);
  });

  it('activates the new terms only on their effective Warsaw date', () => {
    expect(
      legalDocumentRegistry.terms.map((document) => document.version),
    ).toEqual(['1-beta', '2-beta']);
    expect(
      getCurrentLegalDocument('terms', new Date('2026-11-09T22:59:59Z'))
        .version,
    ).toBe('1-beta');
    expect(
      getCurrentLegalDocument('terms', new Date('2026-11-09T23:00:00Z'))
        .version,
    ).toBe('2-beta');
  });

  it('keeps the future terms valid MDX without draft markers', async () => {
    const source = await readFile(
      new URL('../../content/legal/terms/2-beta.mdx', import.meta.url),
      'utf8',
    );
    expect(source).toContain('date: 2026-11-10');
    expect(source).not.toContain('DRAFT');
    await expect(
      compile(source, { remarkPlugins: [remarkFrontmatter] }),
    ).resolves.toBeDefined();
  });
});
