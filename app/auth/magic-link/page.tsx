import { getCurrentLegalDocument } from '@/lib/legal/legalDocuments';
import { connection } from 'next/server';
import MagicLinkForm from './MagicLinkForm';

export default async function MagicLinkPage() {
  await connection();
  const { version } = getCurrentLegalDocument('terms');

  return <MagicLinkForm termsVersion={version} />;
}
