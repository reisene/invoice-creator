import { getCurrentLegalDocument } from '@/lib/legalDocuments';
import { connection } from 'next/server';
import SignUpForm from './SignUpForm';

export default async function SignUpPage() {
  await connection();
  const { version } = getCurrentLegalDocument('terms');

  return <SignUpForm termsVersion={version} />;
}
