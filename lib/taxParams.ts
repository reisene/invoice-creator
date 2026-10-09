import type { TaxParams } from '@/types/taxParams';
import { prisma } from './db';

export type { TaxParams } from '@/types/taxParams';

type TaxParamRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.taxParam.findFirst>>
>;

function toTaxParams(params: TaxParamRecord): TaxParams {
  return {
    year: params.year,
    pensionRate: params.pensionRate.toNumber(),
    rentRate: params.rentRate.toNumber(),
    sicknessRate: params.sicknessRate.toNumber(),
    healthRate: params.healthRate.toNumber(),
    taxRate1: params.taxRate1.toNumber(),
    taxRate2: params.taxRate2.toNumber(),
    taxThreshold: params.taxThreshold.toNumber(),
    monthlyTaxReduction: params.monthlyTaxReduction.toNumber(),
    yearlyYoungReliefLimit: params.yearlyYoungReliefLimit.toNumber(),
    zusLimitMultiple: params.zusLimitMultiple,
    minimumWage: params.minimumWage.toNumber(),
    costRateStandard: params.costRateStandard.toNumber(),
    costRateArtistic: params.costRateArtistic.toNumber(),
  } satisfies TaxParams;
}

export async function getAllTaxParams(): Promise<TaxParams[]> {
  const params = await prisma.taxParam.findMany({ orderBy: { year: 'asc' } });
  return params.map(toTaxParams);
}
