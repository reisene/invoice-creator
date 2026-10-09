import GeneratorClient from '@/components/generator/GeneratorClient';
import { getAllTaxParams } from '@/lib/taxParams';

export const dynamic = 'force-dynamic';

export default async function GeneratorPage() {
  const taxParams = await getAllTaxParams();

  return <GeneratorClient taxParams={taxParams} />;
}
