export type ContractorStatus =
  'standard' | 'student_under_26' | 'with_employment';

export type ContractType = 'monthly' | 'hourly';

export type ClientType = 'company' | 'private';

export type CostType = '20' | '50';

export type TaxReductionAmount = 0 | 150 | 300;

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

  // Ulga podatkowa
  taxReduction: boolean;
  taxReductionAmount: TaxReductionAmount;

  // Dodatkowe informacje
  notes?: string;
}
