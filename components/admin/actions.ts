'use server';

import { requireAdmin } from '@/lib/admin/requireAdmin';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type CreateTaxParamState = {
  ok: boolean;
  message: string;
};

function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Brak wymaganego pola: ${key}`);
  }

  return value.trim();
}

function getRequiredInt(formData: FormData, key: string): number {
  const value = getRequiredString(formData, key);
  const numberValue = Number.parseInt(value, 10);

  if (!Number.isInteger(numberValue)) {
    throw new Error(`Pole ${key} musi być liczbą całkowitą`);
  }

  return numberValue;
}

export async function createTaxParamAction(
  _state: CreateTaxParamState,
  formData: FormData,
): Promise<CreateTaxParamState> {
  const admin = await requireAdmin();
  try {
    const year = getRequiredInt(formData, 'year');

    await prisma.taxParam.create({
      data: {
        year,
        pensionRate: getRequiredString(formData, 'pensionRate'),
        rentRate: getRequiredString(formData, 'rentRate'),
        sicknessRate: getRequiredString(formData, 'sicknessRate'),
        healthRate: getRequiredString(formData, 'healthRate'),
        taxRate1: getRequiredString(formData, 'taxRate1'),
        taxRate2: getRequiredString(formData, 'taxRate2'),
        taxThreshold: getRequiredString(formData, 'taxThreshold'),
        monthlyTaxReduction: getRequiredString(formData, 'monthlyTaxReduction'),
        yearlyYoungReliefLimit: getRequiredString(
          formData,
          'yearlyYoungReliefLimit',
        ),
        zusLimitMultiple: getRequiredInt(formData, 'zusLimitMultiple'),
        minimumWage: getRequiredString(formData, 'minimumWage'),
        costRateStandard: getRequiredString(formData, 'costRateStandard'),
        costRateArtistic: getRequiredString(formData, 'costRateArtistic'),
        createdBy: admin.email || admin.id,
        comment: formData.get('comment')?.toString().trim() || null,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/tax-params');

    return {
      ok: true,
      message: `Dodano parametry podatkowe dla roku ${year}`,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: false,
      message: 'Nieznany błąd',
    };
  }
}
