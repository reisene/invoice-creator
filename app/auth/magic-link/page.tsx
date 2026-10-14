import { TERMS_VERSION } from '@/lib/termsMetadata';
import MagicLinkForm from './MagicLinkForm';

export default function MagicLinkPage() {
  return <MagicLinkForm termsVersion={TERMS_VERSION} />;
}
