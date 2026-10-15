import type { TaxParams } from '@/types/taxParams';
import { prisma } from './db';
import { logServerError } from './serverLogger';
import { DEFAULT_TAX_PARAMS } from './taxConstants';

export type { TaxParams } from '@/types/taxParams';
export { DEFAULT_TAX_PARAMS };

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
  try {
    const params = await prisma.taxParam.findMany({ orderBy: { year: 'asc' } });
    if (params.length > 0) {
      return params.map(toTaxParams);
    }
  } catch (error) {
    logServerError('Failed to load tax params from database:', error);
  }
  return [DEFAULT_TAX_PARAMS];
}
