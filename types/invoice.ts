export interface InvoiceData {
  issuePlace?: string;
  issueDate?: string;

  // Dane stron i umowy
  client: {
    type: 'company' | 'private';
    name: string;
    address: string;
    nip?: string;
    pesel?: string;
  };

  contractor: {
    name: string;
    address: string;
    pesel: string;
    nip?: string;
  };

  contract: {
    number?: string;
    date: string;
    periodStart: string;
    periodEnd: string;
    type: 'monthly' | 'hourly';
  };

  payment: {
    method: 'CASH' | 'TRANSFER' | '';
    transferTarget: 'SAVED_ACCOUNT' | 'DECLARATION' | '';
    accountHolder?: string;
    bankName?: string;
    accountNumber?: string;
  };

  // Wynagrodzenie
  remuneration: {
    gross: number;
    hourlyRate?: number;
    hoursWorked?: number;
  };

  // Status i opcje
  contractorStatus: 'standard' | 'student_under_26' | 'with_employment';
  voluntarySickness: boolean;
  costType: '20' | '50';
  youngRelief: boolean;
  taxReduction: boolean;
  taxReductionAmount: 0 | 100 | 150 | 300;

  // Wyliczenia
  calculations: {
    // Brutto
    gross: number;

    // Składki społeczne (zleceniobiorca)
    pensionContribution: number; // emerytalna 9,76%
    rentContribution: number; // rentowa 1,5%
    sicknessContribution: number; // chorobowa 2,45%
    totalSocialContributions: number;

    // Podstawa składki zdrowotnej
    healthContributionBase: number;

    // Składka zdrowotna
    healthContribution: number; // 9%

    // Koszty uzyskania przychodu
    taxDeductibleCosts: number; // 20% lub 50%
    youngReliefIncomeApplied: number;

    // Podstawa opodatkowania
    taxableBaseUnrounded: number;
    taxableBase: number; // po zaokrągleniu

    // Zaliczka na PIT
    taxBeforeReduction: number;
    taxReductionAmountApplied: number;
    tax: number; // po uldze

    // Kwota netto
    net: number;
  };

  // Uwagi
  notes?: string;
}
