import type { InvoiceFormData } from '@/types/invoiceForm';
import type { TaxParams } from '@/types/taxParams';
import { calculateInvoice } from './calculateInvoice';

export interface InvoiceIncomeEntry {
  id: string;
  uid: string | null;
  createdAt: Date;
  form: InvoiceFormData;
}

export interface InvoiceIncomeTarget {
  id?: string;
  uid?: string | null;
  createdAt?: Date;
  periodStart: string;
  contractorPesel: string;
}

export function normalizeContractorPesel(pesel: string): string {
  return pesel.replace(/[\s-]/g, '');
}

export function getPreviousInvoiceTaxableIncome(
  invoices: readonly InvoiceIncomeEntry[],
  target: InvoiceIncomeTarget,
  taxParams: TaxParams,
): number {
  const contractorPesel = normalizeContractorPesel(target.contractorPesel);
  const year = target.periodStart.slice(0, 4);
  let total = 0;

  for (const invoice of invoices) {
    if (
      invoice.id === target.id ||
      invoice.form.periodStart.slice(0, 4) !== year ||
      invoice.form.periodStart > target.periodStart ||
      normalizeContractorPesel(invoice.form.contractorPesel) !== contractorPesel
    ) {
      continue;
    }

    if (invoice.form.periodStart === target.periodStart && target.createdAt) {
      const difference =
        invoice.createdAt.getTime() - target.createdAt.getTime();
      const invoiceKey = invoice.uid ?? invoice.id;
      const targetKey = target.uid ?? target.id ?? '';
      if (difference > 0 || (difference === 0 && invoiceKey >= targetKey)) {
        continue;
      }
    }

    const { calculations } = calculateInvoice(
      {
        ...invoice.form,
        yearToDateTaxableIncome: 0,
        yearToDateEmploymentIncome: 0,
        noTaxAdvanceRequest: false,
        taxReduction: false,
      },
      taxParams,
    );
    total += calculations.taxableBase;
  }

  return total;
}
