// @vitest-environment node
import { parseParty } from '@/lib/invoice/parseParty';
import { sanitizeInvoiceForm } from '@/lib/invoice/sanitizeInvoiceForm';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import {
  birthDateFromPesel,
  isValidNip,
  isValidPesel,
  isValidPolishBankAccount,
  validateInvoiceForm,
} from '@/lib/invoice/validateInvoiceForm';
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { describe, expect, it } from 'vitest';

function pesel(prefix: string): string {
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = [...prefix].reduce(
    (total, digit, index) => total + Number(digit) * weights[index],
    0,
  );
  return prefix + ((10 - (sum % 10)) % 10);
}
const base: InvoiceFormData = {
  ...SAMPLE_INVOICE_PRESETS[0].formData,
  clientNip: '5250001003',
  contractorPesel: pesel('0023151234'),
};

describe('identifier checks and birth dates', () => {
  it('checks checksums and accepts formatting separators', () => {
    expect(isValidPesel(base.contractorPesel)).toBe(true);
    expect(
      isValidPesel(
        ` ${base.contractorPesel.slice(0, 6)}-${base.contractorPesel.slice(6)}`,
      ),
    ).toBe(true);
    expect(isValidPesel('123')).toBe(false);
    expect(isValidPesel('12345678901')).toBe(false);
    expect(isValidNip('525-000-10-03')).toBe(true);
    expect(isValidNip('abc')).toBe(false);
    expect(isValidNip('1234567890')).toBe(false);
    expect(isValidNip('0000000060')).toBe(false);
    expect(
      isValidPolishBankAccount('pl 61-1090 1014 0000 0712 1981 2874'),
    ).toBe(true);
    expect(isValidPolishBankAccount('123')).toBe(false);
    expect(isValidPolishBankAccount('62109010140000071219812874')).toBe(false);
  });
  it.each([
    ['0081011234', '1800-01-01'],
    ['9992311234', '1899-12-31'],
    ['0001011234', '1900-01-01'],
    ['0021011234', '2000-01-01'],
    ['0041011234', '2100-01-01'],
    ['0061011234', '2200-01-01'],
    ['0080011234', null],
    ['0090011234', '1800-10-01'],
    ['0093011234', null],
    ['0022301234', null],
    ['0013011234', null],
    ['0021001234', null],
    ['0010011234', '1900-10-01'],
  ])('extracts a real birth date from %s', (prefix, expected) => {
    expect(birthDateFromPesel(pesel(prefix))).toBe(expected);
  });
  it('rejects invalid checksums before parsing dates', () => {
    expect(birthDateFromPesel('invalid')).toBeNull();
  });
});

describe('trusted invoice input', () => {
  it('copies whitelisted values only and preserves every supported preset', () => {
    for (const preset of SAMPLE_INVOICE_PRESETS) {
      const result = sanitizeInvoiceForm({
        ...preset.formData,
        injected: 'drop me',
      });
      expect(result).toMatchObject(preset.formData);
      expect(result).not.toHaveProperty('injected');
    }
  });
  it.each([null, undefined, 'input', 5, [], {}])(
    'rejects incomplete or non-object %j',
    (input) => {
      expect(sanitizeInvoiceForm(input)).toBeNull();
    },
  );
  it.each([
    'clientType',
    'contractType',
    'contractorStatus',
    'costType',
    'taxReductionAmount',
    'paymentMethod',
    'transferTarget',
    'clientName',
    'clientAddress',
    'clientNip',
    'clientPesel',
    'contractorName',
    'contractorAddress',
    'contractorPesel',
    'contractorNip',
    'contractNumber',
    'contractDate',
    'issuePlace',
    'issueDate',
    'periodStart',
    'periodEnd',
    'grossAmount',
    'hourlyRate',
    'hoursWorked',
    'yearToDateTaxableIncome',
    'yearToDateEmploymentIncome',
    'yearToDateYoungReliefIncome',
    'notes',
    'bankAccountHolder',
    'bankName',
    'bankAccountNumber',
    'voluntarySickness',
    'youngRelief',
    'noTaxAdvanceRequest',
    'taxReduction',
  ])('rejects invalid field %s', (key) => {
    expect(sanitizeInvoiceForm({ ...base, [key]: {} })).toBeNull();
  });
  it('handles legacy omissions, optional null/empty values and numeric boundaries', () => {
    const result = sanitizeInvoiceForm({
      ...base,
      paymentMethod: undefined,
      transferTarget: undefined,
      noTaxAdvanceRequest: undefined,
      yearToDateEmploymentIncome: undefined,
      notes: null,
      clientNip: '',
      grossAmount: null,
    });
    expect(result).toMatchObject({
      paymentMethod: '',
      transferTarget: '',
      noTaxAdvanceRequest: false,
      yearToDateEmploymentIncome: 0,
    });
    expect(result?.notes).toBeUndefined();
    expect(result?.clientNip).toBeUndefined();
    expect(result?.grossAmount).toBeUndefined();
    for (const number of [NaN, Infinity, -Infinity, 1e9, -1e9]) {
      expect(sanitizeInvoiceForm({ ...base, grossAmount: number })).toBeNull();
    }
    expect(
      sanitizeInvoiceForm({ ...base, grossAmount: 999999999 }),
    ).not.toBeNull();
    expect(
      sanitizeInvoiceForm({ ...base, clientName: 'a'.repeat(201) }),
    ).toBeNull();
    expect(
      sanitizeInvoiceForm({ ...base, clientName: 'a'.repeat(200) }),
    ).not.toBeNull();
  });
});

describe('invoice business validation', () => {
  it('accepts a complete invoice, private clients and the missing-issue-details option', () => {
    expect(validateInvoiceForm(base, DEFAULT_TAX_PARAMS)).toEqual([]);
    expect(
      validateInvoiceForm({
        ...base,
        clientType: 'private',
        clientPesel: base.contractorPesel,
        contractorNip: base.clientNip,
      }),
    ).toEqual([]);
    expect(
      validateInvoiceForm({
        ...base,
        clientType: 'private',
        clientPesel: undefined,
      }),
    ).toEqual([]);
    expect(
      validateInvoiceForm(
        { ...base, issuePlace: undefined, issueDate: undefined },
        undefined,
        { allowMissingIssueDetails: true },
      ),
    ).toEqual([]);
    expect(
      validateInvoiceForm({
        ...base,
        paymentMethod: 'CASH',
        transferTarget: '',
      }),
    ).toEqual([]);
    expect(
      validateInvoiceForm({ ...base, transferTarget: 'DECLARATION' }),
    ).toEqual([]);
    expect(
      validateInvoiceForm({
        ...base,
        contractType: 'hourly',
        hourlyRate: 30,
        hoursWorked: 2,
      }),
    ).toEqual([]);
  });
  it.each([
    [{ issuePlace: ' ' }, 'Podaj miejscowość'],
    [{ issuePlace: 'a'.repeat(101) }, 'maksymalnie 100'],
    [{ issueDate: undefined }, 'datę wystawienia'],
    [{ issueDate: '2026-02-30' }, 'datę wystawienia'],
    [{ clientName: '' }, 'nazwę zleceniodawcy'],
    [{ clientAddress: '' }, 'adres zleceniodawcy'],
    [{ clientNip: '' }, 'Podaj NIP'],
    [{ clientNip: 'bad' }, 'NIP zleceniodawcy'],
    [{ clientType: 'private', clientPesel: 'bad' }, 'PESEL zleceniodawcy'],
    [{ contractorName: '' }, 'imię i nazwisko'],
    [{ contractorAddress: '' }, 'adres zleceniobiorcy'],
    [{ contractorPesel: '' }, 'Podaj PESEL'],
    [{ contractorPesel: 'bad' }, 'PESEL zleceniobiorcy'],
    [{ contractorNip: 'bad' }, 'NIP zleceniobiorcy'],
    [{ paymentMethod: '' }, 'Wybierz formę'],
    [{ paymentMethod: 'CASH' }, 'Usuń sposób przelewu'],
    [{ transferTarget: '' }, 'Wybierz rachunek'],
    [{ bankAccountHolder: '' }, 'Uzupełnij dane rachunku'],
    [{ bankName: '' }, 'Uzupełnij dane rachunku'],
    [{ bankAccountNumber: '' }, 'Uzupełnij dane rachunku'],
    [{ bankAccountNumber: '123' }, 'Numer rachunku'],
    [{ contractDate: 'invalid' }, 'wszystkie daty'],
    [{ periodEnd: '2026-01-01' }, 'przed jego początkiem'],
    [{ periodEnd: '2027-01-01' }, 'w jednym roku'],
    [{ grossAmount: 0 }, 'kwotę brutto'],
    [{ grossAmount: -1 }, 'kwotę brutto'],
    [
      { contractType: 'hourly', hourlyRate: 0, hoursWorked: 1 },
      'stawkę godzinową',
    ],
    [
      { contractType: 'hourly', hourlyRate: -1, hoursWorked: 1 },
      'stawkę godzinową',
    ],
    [
      { contractType: 'hourly', hourlyRate: 30, hoursWorked: 0 },
      'liczbę przepracowanych',
    ],
    [
      { contractType: 'hourly', hourlyRate: 30, hoursWorked: -1 },
      'liczbę przepracowanych',
    ],
    [{ yearToDateTaxableIncome: -1 }, 'Dochód od początku'],
    [{ yearToDateEmploymentIncome: -1 }, 'Dochód z umowy o pracę'],
    [
      {
        contractorStatus: 'student_under_26',
        contractorPesel: pesel('9001011234'),
      },
      'Status studenta',
    ],
    [
      { youngRelief: true, contractorPesel: pesel('9001011234') },
      'Ulga dla młodych',
    ],
    [
      { youngRelief: true, yearToDateYoungReliefIncome: -1 },
      'Przychód objęty ulgą',
    ],
    [
      { youngRelief: true, yearToDateYoungReliefIncome: 85529 },
      'przekracza roczny limit',
    ],
  ] satisfies [Partial<InvoiceFormData>, string][])(
    'reports invalid input %j',
    (overrides, expected) => {
      expect(
        validateInvoiceForm({ ...base, ...overrides }, DEFAULT_TAX_PARAMS).join(
          '\n',
        ),
      ).toContain(expected);
    },
  );
  it('allows the last eligible day, skips age checks for invalid dates and applies the inclusive relief limit', () => {
    const young = {
      ...base,
      youngRelief: true,
      contractorStatus: 'student_under_26' as const,
    };
    expect(
      validateInvoiceForm(
        { ...young, periodEnd: '2026-03-15' },
        DEFAULT_TAX_PARAMS,
      ),
    ).toEqual([]);
    expect(
      validateInvoiceForm(
        { ...young, periodEnd: '2026-03-16' },
        DEFAULT_TAX_PARAMS,
      ),
    ).toHaveLength(2);
    expect(
      validateInvoiceForm({ ...young, contractorPesel: 'bad' }),
    ).toHaveLength(1);
    expect(validateInvoiceForm({ ...young, periodEnd: 'bad' })).toHaveLength(1);
    expect(
      validateInvoiceForm(
        {
          ...young,
          periodEnd: '2026-03-15',
          yearToDateYoungReliefIncome: 85528,
        },
        DEFAULT_TAX_PARAMS,
      ),
    ).toEqual([]);
    expect(
      validateInvoiceForm({
        ...young,
        periodEnd: '2026-03-15',
        yearToDateYoungReliefIncome: 99999,
      }),
    ).toEqual([]);
  });
});

describe('saved party input', () => {
  const party = { kind: 'CONTRACTOR', name: ' Jan ', address: ' Adres ' };
  it.each([
    null,
    1,
    '',
    {},
    ...[
      { kind: 'INVALID' },
      { clientType: null },
      { name: 1 },
      { name: 'a'.repeat(201) },
      { address: 1 },
      { address: 'a'.repeat(301) },
      { nip: 1 },
      { pesel: 1 },
    ].map((overrides) => ({ ...party, ...overrides })),
  ])('rejects structurally invalid %j', (input) => {
    expect(parseParty(input)).toEqual({
      ok: false,
      error: 'Nieprawidłowe dane strony.',
    });
  });
  it.each([
    [{ nip: 'a'.repeat(21) }, 'NIP jest zbyt długi.'],
    [{ pesel: 'a'.repeat(21) }, 'PESEL jest zbyt długi.'],
    [{ name: ' ' }, 'Podaj nazwę i adres.'],
    [{ address: ' ' }, 'Podaj nazwę i adres.'],
    [{ nip: '123' }, 'NIP jest nieprawidłowy.'],
    [{ pesel: '123' }, 'PESEL jest nieprawidłowy.'],
  ])('rejects invalid party values %j', (overrides, error) => {
    expect(parseParty({ ...party, ...overrides })).toEqual({
      ok: false,
      error,
    });
  });
  it('trims values, defaults client type and clears empty identifiers', () => {
    expect(parseParty(party)).toEqual({
      ok: true,
      party: {
        kind: 'CONTRACTOR',
        clientType: null,
        name: 'Jan',
        address: 'Adres',
        nip: null,
        pesel: null,
      },
    });
    expect(
      parseParty({
        ...party,
        kind: 'CLIENT',
        nip: ` ${base.clientNip} `,
        pesel: base.contractorPesel,
      }),
    ).toMatchObject({
      ok: true,
      party: {
        clientType: 'company',
        nip: base.clientNip,
        pesel: base.contractorPesel,
      },
    });
    expect(
      parseParty({
        ...party,
        kind: 'CLIENT',
        clientType: 'private',
        nip: ' ',
        pesel: '',
      }),
    ).toMatchObject({
      ok: true,
      party: { clientType: 'private', nip: null, pesel: null },
    });
  });
});
