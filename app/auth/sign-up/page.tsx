import { TERMS_VERSION } from '@/lib/termsMetadata';
import SignUpForm from './SignUpForm';

export default function SignUpPage() {
  return <SignUpForm termsVersion={TERMS_VERSION} />;
}
