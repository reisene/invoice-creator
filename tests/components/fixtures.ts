import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { UserBankAccountDto } from '@/types/savedData';

export const bankAccount: UserBankAccountDto = {
  accountHolder: 'Jan Kowalski',
  bankName: 'Santander Bank Polska',
  accountNumber: '61109010140000071219812874',
};

export function formData(
  overrides: Partial<InvoiceFormData> = {},
): InvoiceFormData {
  return {
    ...SAMPLE_INVOICE_PRESETS[0].formData,
    clientNip: '5250001003',
    contractorPesel: '90010112349',
    ...overrides,
  };
}
