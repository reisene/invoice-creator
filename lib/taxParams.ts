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

export const DEFAULT_TAX_PARAMS: TaxParams = {
  year: 2026,
  pensionRate: 0.0976,
  rentRate: 0.015,
  sicknessRate: 0.0245,
  healthRate: 0.09,
  taxRate1: 0.12,
  taxRate2: 0.32,
  taxThreshold: 120000,
  monthlyTaxReduction: 300,
  yearlyYoungReliefLimit: 85528,
  zusLimitMultiple: 30,
  minimumWage: 4806,
  costRateStandard: 0.2,
  costRateArtistic: 0.5,
};

export async function getAllTaxParams(): Promise<TaxParams[]> {
  try {
    const params = await prisma.taxParam.findMany({ orderBy: { year: 'asc' } });
    if (params.length > 0) {
      return params.map(toTaxParams);
    }
  } catch (error) {
    console.error('Failed to load tax params from database:', error);
  }
  return [DEFAULT_TAX_PARAMS];
}
