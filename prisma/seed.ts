import { prisma } from '@/lib/db';

async function main() {
  const params = await prisma.taxParam.upsert({
    where: { year: 2026 },
    update: {},
    create: {
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
      createdBy: 'system-seed',
      comment: 'Domyślne parametry kalkulatora na 2026 r.',
    },
  });

  console.info(`Tax parameters for ${params.year} are ready.`);
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed tax parameters:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
