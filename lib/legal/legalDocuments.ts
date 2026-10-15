import 'server-only';

import { legalDocumentRegistry } from '@/content/legal/registry.generated';
import type { ComponentType } from 'react';

export type LegalDocumentKind = keyof typeof legalDocumentRegistry;

type LegalDocument = {
  version: string;
  effectiveDate: string;
  Content: ComponentType;
};

function getWarsawDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const getPart = (type: 'year' | 'month' | 'day') => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new Error(`Unable to determine Warsaw ${type}.`);
    return value;
  };

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

export function getCurrentLegalDocument(
  kind: LegalDocumentKind,
  now = new Date(),
): LegalDocument {
  const today = getWarsawDate(now);
  const documents =
    kind === 'terms'
      ? legalDocumentRegistry.terms
      : legalDocumentRegistry.privacy;
  const document = documents
    .filter((candidate) => candidate.effectiveDate <= today)
    .at(-1);

  if (!document) {
    throw new Error(
      `No effective ${kind} document is configured for ${today}.`,
    );
  }

  return document;
}
