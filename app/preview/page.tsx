import { getAllTaxParams } from '@/lib/invoice/taxParams';
import type { Metadata } from 'next';
import PreviewClient from './PreviewClient';

export const metadata: Metadata = {
  title: 'Wzory i podgląd rachunków',
  description:
    'Przeglądaj wzorce rachunków do umowy zlecenia: standard, student do 26 lat, zbieg z etatem, 50% koszty autorskie i stawka godzinowa. Zmieniaj kwoty i pobieraj gotowy PDF.',
};

export default async function PreviewPage() {
  const taxParams = await getAllTaxParams();

  return <PreviewClient taxParams={taxParams} />;
}
