import privacy_1_beta from './privacy/1-beta.mdx';
import terms_1_beta from './terms/1-beta.mdx';

export const legalDocumentRegistry = {
  terms: [
    { version: '1-beta', effectiveDate: '2026-10-14', Content: terms_1_beta },
  ],
  privacy: [
    { version: '1-beta', effectiveDate: '2026-10-14', Content: privacy_1_beta },
  ],
} as const;
