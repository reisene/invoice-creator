import type { InvoiceFormData } from '@/types/invoiceForm';
import type { TaxParams } from '@/types/taxParams';

function digitsOnly(value: string): string {
  return value.replace(/[\s-]/g, '');
}

export function isValidPesel(value: string): boolean {
  const pesel = digitsOnly(value);
  if (!/^\d{11}$/.test(pesel)) return false;

  const sum =
    Number(pesel.charAt(0)) +
    3 * Number(pesel.charAt(1)) +
    7 * Number(pesel.charAt(2)) +
    9 * Number(pesel.charAt(3)) +
    Number(pesel.charAt(4)) +
    3 * Number(pesel.charAt(5)) +
    7 * Number(pesel.charAt(6)) +
    9 * Number(pesel.charAt(7)) +
    Number(pesel.charAt(8)) +
    3 * Number(pesel.charAt(9));
  return (10 - (sum % 10)) % 10 === Number(pesel[10]);
}

export function isValidNip(value: string): boolean {
  const nip = digitsOnly(value);
  if (!/^\d{10}$/.test(nip)) return false;

  const sum =
    6 * Number(nip.charAt(0)) +
    5 * Number(nip.charAt(1)) +
    7 * Number(nip.charAt(2)) +
    2 * Number(nip.charAt(3)) +
    3 * Number(nip.charAt(4)) +
    4 * Number(nip.charAt(5)) +
    5 * Number(nip.charAt(6)) +
    6 * Number(nip.charAt(7)) +
    7 * Number(nip.charAt(8));
  const control = sum % 11;
  return control !== 10 && control === Number(nip[9]);
}

export function isValidPolishBankAccount(value: string): boolean {
  const accountNumber = value
    .replace(/[\s-]/g, '')
    .toUpperCase()
    .replace(/^PL/, '');
  if (!/^\d{26}$/.test(accountNumber)) return false;

  const rearranged =
    accountNumber.slice(2) + '2521' + accountNumber.slice(0, 2);
  let remainder = 0;
  for (const digit of rearranged) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function birthDateFromPesel(value: string): string | null {
  const pesel = digitsOnly(value);
  if (!isValidPesel(pesel)) return null;

  const yy = Number(pesel.slice(0, 2));
  const mmRaw = Number(pesel.slice(2, 4));
  const dd = Number(pesel.slice(4, 6));
  const centuryOffset = Math.floor(mmRaw / 20);
  let century: number;
  switch (centuryOffset) {
    case 8:
      century = 1800;
      break;
    case 0:
      century = 1900;
      break;
    case 1:
      century = 2000;
      break;
    case 2:
      century = 2100;
      break;
    case 3:
      century = 2200;
      break;
    default:
      return null;
  }

  const month = mmRaw % 20;
  const year = century + yy;
  const date = new Date(Date.UTC(year, month - 1, dd));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== dd
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function validateInvoiceForm(
  data: InvoiceFormData,
  params?: TaxParams,
  options: { allowMissingIssueDetails?: boolean } = {},
): string[] {
  const errors: string[] = [];

  if (!options.allowMissingIssueDetails) {
    if (!data.issuePlace?.trim()) {
      errors.push('Podaj miejscowość wystawienia rachunku.');
    } else if (data.issuePlace.length > 100) {
      errors.push('Miejscowość wystawienia może mieć maksymalnie 100 znaków.');
    }

    if (!data.issueDate || !isValidDate(data.issueDate)) {
      errors.push('Podaj prawidłową datę wystawienia rachunku.');
    }
  }

  if (!data.clientName.trim()) errors.push('Podaj nazwę zleceniodawcy.');
  if (!data.clientAddress.trim()) errors.push('Podaj adres zleceniodawcy.');

  if (data.clientType === 'company') {
    if (!data.clientNip?.trim()) {
      errors.push('Podaj NIP zleceniodawcy.');
    } else if (!isValidNip(data.clientNip)) {
      errors.push('NIP zleceniodawcy jest nieprawidłowy.');
    }
  } else if (data.clientPesel?.trim() && !isValidPesel(data.clientPesel)) {
    errors.push('PESEL zleceniodawcy jest nieprawidłowy.');
  }

  if (!data.contractorName.trim())
    errors.push('Podaj imię i nazwisko zleceniobiorcy.');
  if (!data.contractorAddress.trim())
    errors.push('Podaj adres zleceniobiorcy.');

  if (!data.contractorPesel.trim()) {
    errors.push('Podaj PESEL zleceniobiorcy.');
  } else if (!isValidPesel(data.contractorPesel)) {
    errors.push('PESEL zleceniobiorcy jest nieprawidłowy.');
  }

  if (data.contractorNip?.trim() && !isValidNip(data.contractorNip)) {
    errors.push('NIP zleceniobiorcy jest nieprawidłowy.');
  }

  if (!data.paymentMethod) {
    errors.push(
      'Wybierz formę wypłaty wynagrodzenia (gotówka lub przelew) — starsze rachunki jej nie zawierają.',
    );
  } else if (data.paymentMethod === 'CASH' && data.transferTarget) {
    errors.push('Usuń sposób przelewu dla wypłaty gotówką.');
  } else if (
    data.paymentMethod === 'TRANSFER' &&
    data.transferTarget !== 'SAVED_ACCOUNT' &&
    data.transferTarget !== 'DECLARATION'
  ) {
    errors.push('Wybierz rachunek do przelewu.');
  } else if (
    data.paymentMethod === 'TRANSFER' &&
    data.transferTarget === 'SAVED_ACCOUNT' &&
    (!data.bankAccountHolder?.trim() ||
      !data.bankName?.trim() ||
      !data.bankAccountNumber?.trim())
  ) {
    errors.push('Uzupełnij dane rachunku bankowego do przelewu.');
  } else if (
    data.paymentMethod === 'TRANSFER' &&
    data.transferTarget === 'SAVED_ACCOUNT' &&
    !isValidPolishBankAccount(data.bankAccountNumber ?? '')
  ) {
    errors.push('Numer rachunku bankowego jest nieprawidłowy.');
  }

  const datesValid = [
    data.contractDate,
    data.periodStart,
    data.periodEnd,
  ].every(isValidDate);
  if (!datesValid) {
    errors.push('Uzupełnij wszystkie daty.');
  } else if (data.periodEnd < data.periodStart) {
    errors.push('Koniec okresu rozliczeniowego jest przed jego początkiem.');
  } else if (data.periodStart.slice(0, 4) !== data.periodEnd.slice(0, 4)) {
    errors.push('Okres rozliczeniowy musi mieścić się w jednym roku.');
  }

  if (data.contractType === 'monthly') {
    if (!data.grossAmount || data.grossAmount <= 0) {
      errors.push('Podaj kwotę brutto większą od zera.');
    }
  } else {
    if (!data.hourlyRate || data.hourlyRate <= 0) {
      errors.push('Podaj stawkę godzinową większą od zera.');
    }
    if (!data.hoursWorked || data.hoursWorked <= 0) {
      errors.push('Podaj liczbę przepracowanych godzin.');
    }
  }

  if (data.yearToDateTaxableIncome < 0) {
    errors.push('Dochód od początku roku nie może być ujemny.');
  }
  if ((data.yearToDateEmploymentIncome ?? 0) < 0) {
    errors.push('Dochód z umowy o pracę nie może być ujemny.');
  }

  if (data.contractorStatus === 'student_under_26') {
    const birthDate = birthDateFromPesel(data.contractorPesel);
    if (birthDate && isValidDate(data.periodEnd)) {
      const turns26 = `${Number(birthDate.slice(0, 4)) + 26}${birthDate.slice(4)}`;
      if (data.periodEnd > turns26) {
        errors.push(
          'Status studenta do 26 lat (zwolnienie ze składek ZUS) przysługuje do dnia 26. urodzin włącznie.',
        );
      }
    }
  }

  if (data.youngRelief) {
    const birthDate = birthDateFromPesel(data.contractorPesel);
    if (birthDate && isValidDate(data.periodEnd)) {
      const turns26 = `${Number(birthDate.slice(0, 4)) + 26}${birthDate.slice(4)}`;
      if (data.periodEnd > turns26) {
        errors.push(
          'Ulga dla młodych przysługuje do dnia 26. urodzin włącznie – zleceniobiorca ukończył 26 lat przed końcem okresu rozliczeniowego.',
        );
      }
    }

    if (data.yearToDateYoungReliefIncome < 0) {
      errors.push('Przychód objęty ulgą dla młodych nie może być ujemny.');
    } else if (
      params &&
      data.yearToDateYoungReliefIncome > params.yearlyYoungReliefLimit
    ) {
      errors.push(
        `Przychód objęty ulgą dla młodych przekracza roczny limit (${params.yearlyYoungReliefLimit} zł).`,
      );
    }
  }

  return errors;
}
