import 'server-only';

import { metadata as currentTermsMetadata } from '@/content/legal/terms-1-beta.mdx';

function getMetadataString(key: 'version' | 'date'): string {
  const value = currentTermsMetadata[key];

  if (typeof value !== 'string') {
    throw new Error(`The current terms document must define a string ${key}.`);
  }

  return value;
}

export const TERMS_VERSION = getMetadataString('version');
export const TERMS_DATE = getMetadataString('date');
