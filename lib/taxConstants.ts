import type { TaxParams } from '@/types/taxParams';

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
