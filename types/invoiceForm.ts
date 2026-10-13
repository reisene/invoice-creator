export type ContractorStatus =
  'standard' | 'student_under_26' | 'with_employment';

export type ContractType = 'monthly' | 'hourly';

export type ClientType = 'company' | 'private';

export type CostType = '20' | '50';

export type TaxReductionAmount = 0 | 100 | 150 | 300;

export type PaymentMethod = 'CASH' | 'TRANSFER' | '';
export type TransferTarget = 'SAVED_ACCOUNT' | 'DECLARATION' | '';

export interface InvoiceFormData {
  // Zleceniodawca
  clientType: ClientType;
  clientName: string;
  clientAddress: string;
  clientNip?: string;
  clientPesel?: string;

  // Zleceniobiorca
  contractorName: string;
  contractorAddress: string;
  contractorPesel: string;
  contractorNip?: string;

  // Umowa
  contractNumber?: string;
  contractDate: string; // ISO Date
  issuePlace?: string;
  issueDate?: string; // ISO Date
  periodStart: string;
  periodEnd: string;
  contractType: ContractType;

  // Wynagrodzenie
  grossAmount?: number;
  hourlyRate?: number;
  hoursWorked?: number;

  // Opcje
  contractorStatus: ContractorStatus;
  voluntarySickness: boolean;
  costType: CostType;
  youngRelief: boolean;
  yearToDateTaxableIncome: number;
  yearToDateYoungReliefIncome: number;

  // Ulga podatkowa
  taxReduction: boolean;
  taxReductionAmount: TaxReductionAmount;

  // Wypłata wynagrodzenia
  paymentMethod: PaymentMethod;
  transferTarget: TransferTarget;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccountNumber?: string;

  // Dodatkowe informacje
  notes?: string;
}
