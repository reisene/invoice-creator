// @vitest-environment node
import { importUserData } from '@/app/account/importActions';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  limit: vi.fn(),
  tax: vi.fn(),
  sanitize: vi.fn(),
  validate: vi.fn(),
  calculate: vi.fn(),
  parseParty: vi.fn(),
  parties: vi.fn(),
  bank: vi.fn(),
  encrypt: vi.fn(),
  encryptJson: vi.fn(),
  log: vi.fn(),
  revalidate: vi.fn(),
  invoices: vi.fn(),
  createInvoices: vi.fn(),
  createParties: vi.fn(),
  upsertSequence: vi.fn(),
  updateSequence: vi.fn(),
  createBank: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('@/lib/currentUser', () => ({ getCurrentUserIdWithTerms: mocks.user }));
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: mocks.limit }));
vi.mock('@/lib/invoice/taxParams', () => ({ getAllTaxParams: mocks.tax }));
vi.mock('@/lib/invoice/sanitizeInvoiceForm', () => ({
  sanitizeInvoiceForm: mocks.sanitize,
}));
vi.mock('@/lib/invoice/calculateInvoice', () => ({
  calculateInvoice: mocks.calculate,
}));
vi.mock('@/lib/invoice/parseParty', () => ({ parseParty: mocks.parseParty }));
vi.mock('@/lib/invoice/validateInvoiceForm', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/lib/invoice/validateInvoiceForm')
  >()),
  validateInvoiceForm: mocks.validate,
}));
vi.mock('@/lib/invoice/invoiceNumbering', () => ({
  getInvoiceNumberScope: (id: string) => `user:${id}`,
}));
vi.mock('@/lib/savedDataAccess', () => ({
  getSavedPartiesForUser: mocks.parties,
  getUserBankAccount: mocks.bank,
}));
vi.mock('@/lib/savedDataCrypto', () => ({
  encryptText: mocks.encrypt,
  encryptJson: mocks.encryptJson,
}));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/lib/db', () => ({
  prisma: {
    invoice: { findMany: mocks.invoices, createMany: mocks.createInvoices },
    savedParty: { createMany: mocks.createParties },
    invoiceSequence: {
      upsert: mocks.upsertSequence,
      updateMany: mocks.updateSequence,
    },
    userBankAccount: { create: mocks.createBank },
    $transaction: mocks.transaction,
  },
}));

const base = SAMPLE_INVOICE_PRESETS[0].formData;
const uid = 'D92DA4C7-C999-4856-96D6-7681B1B96F71';
const party = {
  kind: 'CLIENT',
  clientType: 'company',
  name: 'Firma',
  address: 'Adres',
  nip: null,
  pesel: null,
};
const bank = {
  accountHolder: ' Jan ',
  bankName: ' Bank ',
  accountNumber: '61 1090-1014 0000 0712 1981 2874',
};
function run(payload: unknown, commit = false) {
  return importUserData(JSON.stringify(payload), commit);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue('user-1');
  mocks.limit.mockResolvedValue({ ok: true });
  mocks.tax.mockImplementation(async () => [{ ...DEFAULT_TAX_PARAMS }]);
  mocks.invoices.mockResolvedValue([]);
  mocks.parties.mockResolvedValue([]);
  mocks.bank.mockResolvedValue(null);
  mocks.sanitize.mockImplementation((data: unknown) => data);
  mocks.validate.mockReturnValue([]);
  mocks.calculate.mockReturnValue({ calculations: { net: 4000 } });
  mocks.parseParty.mockImplementation((value: unknown) => ({
    ok: true,
    party: value,
  }));
  mocks.encrypt.mockImplementation((value: string) => `encrypted:${value}`);
  mocks.encryptJson.mockReturnValue('encrypted-form');
  mocks.transaction.mockResolvedValue([]);
});

describe('import format and access', () => {
  it('requires current terms and authentication', async () => {
    mocks.user.mockResolvedValue(null);
    expect(await run({})).toEqual({
      ok: false,
      error: 'Zaloguj się, aby importować dane.',
    });
    expect(mocks.invoices).not.toHaveBeenCalled();
  });

  it('rate-limits imports', async () => {
    mocks.limit.mockResolvedValue({ ok: false, message: 'Limit' });
    expect(await run({})).toEqual({ ok: false, error: 'Limit' });
    expect(mocks.limit).toHaveBeenCalledWith('importData', 'user-1');
  });

  it.each([
    ['', 'Plik jest pusty.'],
    ['a'.repeat(5_000_001), 'Plik jest zbyt duży'],
    ['invalid json', 'prawidłowy plik JSON'],
    ['null', 'Nieprawidłowy format'],
    ['[]', 'Nieprawidłowy format'],
    ['"text"', 'Nieprawidłowy format'],
    ['{"version":2}', 'Nieobsługiwana wersja'],
    ['{"invoices":{}}', 'Nieprawidłowy format'],
    ['{"parties":{}}', 'Nieprawidłowy format'],
  ])('rejects invalid input without database reads', async (raw, error) => {
    expect(await importUserData(raw, false)).toEqual({
      ok: false,
      error: expect.stringContaining(error),
    });
    expect(mocks.invoices).not.toHaveBeenCalled();
  });

  it.each([
    { invoices: Array(501).fill(null) },
    { parties: Array(101).fill(null) },
  ])('rejects too many records %j', async (payload) => {
    expect(await run(payload)).toEqual({
      ok: false,
      error: expect.stringContaining('zbyt wiele rekordów'),
    });
  });

  it.each([{}, { version: 1, invoices: null, parties: null }])(
    'previews an empty valid export %j',
    async (payload) => {
      expect(await run(payload)).toEqual({
        ok: true,
        data: {
          committed: false,
          invoices: { add: 0, duplicates: 0, invalid: 0 },
          parties: { add: 0, duplicates: 0, invalid: 0 },
          bankAccount: 'none',
          problems: [],
        },
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.revalidate).not.toHaveBeenCalled();
    },
  );
});

describe('invoice import', () => {
  it('reports malformed records and missing tax parameters', async () => {
    mocks.tax.mockResolvedValue([]);
    const result = await run({ invoices: [null, {}, { data: base }] });
    expect(result).toMatchObject({
      ok: true,
      data: {
        invoices: { add: 0, invalid: 3 },
        problems: [
          'Rachunek #1: nieprawidłowe dane.',
          'Rachunek #2: nieprawidłowe dane.',
          'Rachunek #3: nieprawidłowe dane.',
        ],
      },
    });
  });

  it('reports validation errors and allows missing issue details only for legacy data', async () => {
    mocks.validate.mockReturnValue(['Invalid date', 'Other error']);
    const legacy = { ...base, issueDate: undefined, issuePlace: undefined };
    expect(
      await run({ invoices: [{ data: legacy }, { data: base }] }),
    ).toMatchObject({
      ok: true,
      data: {
        invoices: { invalid: 2 },
        problems: ['Rachunek #1: Invalid date', 'Rachunek #2: Invalid date'],
      },
    });
    expect(mocks.validate).toHaveBeenNthCalledWith(
      1,
      legacy,
      DEFAULT_TAX_PARAMS,
      { allowMissingIssueDetails: true },
    );
    expect(mocks.validate).toHaveBeenNthCalledWith(
      2,
      base,
      DEFAULT_TAX_PARAMS,
      { allowMissingIssueDetails: false },
    );
  });

  it('detects duplicates by normalized UID and by invoice number, including within one file', async () => {
    mocks.invoices.mockResolvedValue([
      { uid: uid.toLowerCase(), invoiceNumber: '1/2026' },
    ]);
    expect(
      await run({
        invoices: [
          { uid, data: base },
          { invoiceNumber: '1/2026', data: base },
          { invoiceNumber: '2/2026', data: base },
          { invoiceNumber: '2/2026', data: base },
        ],
      }),
    ).toMatchObject({
      ok: true,
      data: { invoices: { add: 1, duplicates: 3, invalid: 0 } },
    });
    expect(mocks.calculate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('commits encrypted invoices, preserves valid UIDs and advances each year sequence to the maximum', async () => {
    expect(
      await run(
        {
          invoices: [
            {
              uid: ` ${uid} `,
              invoiceNumber: ' 2/2026 ',
              data: { ...base, contractNumber: ' U/1 ' },
            },
            { uid: 'invalid', invoiceNumber: '5/2026', data: base },
            {
              invoiceNumber: '3/2026',
              data: { ...base, issuePlace: '', issueDate: '' },
            },
            { invoiceNumber: 'invalid', data: base },
          ],
        },
        true,
      ),
    ).toMatchObject({
      ok: true,
      data: { committed: true, invoices: { add: 4 } },
    });
    expect(mocks.createInvoices).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          uid: uid.toLowerCase(),
          invoiceNumber: '2/2026',
          title: 'encrypted:U/1',
          contractNumber: 'encrypted: U/1 ',
        }),
        expect.objectContaining({
          uid: expect.stringMatching(/^[0-9a-f-]{36}$/),
          invoiceNumber: '5/2026',
          title: 'encrypted:Rachunek 2026-03-01',
          contractNumber: null,
        }),
        expect.objectContaining({
          invoiceNumber: '3/2026',
          issuePlace: null,
          issueDate: null,
        }),
        expect.objectContaining({
          invoiceNumber: null,
          userId: 'user-1',
          data: 'encrypted-form',
          net: 4000,
        }),
      ],
    });
    expect(mocks.upsertSequence).toHaveBeenCalledWith({
      where: { scope_year: { scope: 'user:user-1', year: 2026 } },
      create: { scope: 'user:user-1', year: 2026, value: 5 },
      update: {},
    });
    expect(mocks.updateSequence).toHaveBeenCalledWith({
      where: { scope: 'user:user-1', year: 2026, value: { lt: 5 } },
      data: { value: 5 },
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.revalidate.mock.calls).toEqual([
      ['/account'],
      ['/account/invoices'],
    ]);
  });
});

describe('party and bank import', () => {
  it('reports invalid parties and caps reported problems at ten', async () => {
    mocks.parseParty.mockReturnValue({ ok: false, error: 'Invalid party' });
    const result = await run({ parties: Array(12).fill({}) });
    expect(result).toMatchObject({
      ok: true,
      data: {
        parties: { invalid: 12 },
        problems: expect.arrayContaining(['Strona #1: Invalid party']),
      },
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.data.problems).toHaveLength(10);
  });

  it('deduplicates case-insensitively against existing and incoming parties', async () => {
    mocks.parties.mockResolvedValue([party]);
    expect(
      await run({
        parties: [
          party,
          { ...party, name: 'FIRMA' },
          { ...party, name: 'Nowa' },
          { ...party, name: 'nowa' },
        ],
      }),
    ).toMatchObject({
      ok: true,
      data: { parties: { add: 1, duplicates: 3, invalid: 0 } },
    });
  });

  it('does not exceed the existing party limit', async () => {
    mocks.parties.mockResolvedValue(
      Array(100).fill({ ...party, name: 'Existing' }),
    );
    expect(await run({ parties: [party] })).toMatchObject({
      ok: true,
      data: {
        parties: { invalid: 1 },
        problems: ['Strona #1: przekroczono limit 100.'],
      },
    });
  });

  it('encrypts non-null party identifiers on commit', async () => {
    await run(
      {
        parties: [party, { ...party, name: 'Inna', nip: '123', pesel: '456' }],
      },
      true,
    );
    expect(mocks.createParties).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'user-1',
          name: 'encrypted:Firma',
          address: 'encrypted:Adres',
          label: 'encrypted:Firma',
          nip: null,
          pesel: null,
        }),
        expect.objectContaining({
          name: 'encrypted:Inna',
          nip: 'encrypted:123',
          pesel: 'encrypted:456',
        }),
      ],
    });
  });

  it.each([
    {},
    { accountHolder: 'x'.repeat(201) },
    { accountHolder: 'Jan' },
    { accountHolder: 'Jan', bankName: 'x'.repeat(101) },
    { ...bank, accountNumber: 'invalid' },
  ])('rejects invalid bank details %j', async (bankAccount) => {
    expect(await run({ bankAccount })).toMatchObject({
      ok: true,
      data: { bankAccount: 'invalid' },
    });
    expect(mocks.createBank).not.toHaveBeenCalled();
  });

  it('does not overwrite an existing bank account', async () => {
    mocks.bank.mockResolvedValue(bank);
    expect(await run({ bankAccount: bank }, true)).toMatchObject({
      ok: true,
      data: { bankAccount: 'exists' },
    });
    expect(mocks.createBank).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'normalizes bank details with commit=%s',
    async (commit) => {
      expect(await run({ bankAccount: bank }, commit)).toMatchObject({
        ok: true,
        data: { bankAccount: 'add', committed: commit },
      });
      if (commit) {
        expect(mocks.createBank).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            accountHolder: 'encrypted:Jan',
            bankName: 'encrypted:Bank',
            accountNumber: 'encrypted:61109010140000071219812874',
          },
        });
      } else {
        expect(mocks.createBank).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
      }
    },
  );

  it('logs transaction failure and does not revalidate or claim success', async () => {
    const error = new Error('conflict');
    mocks.transaction.mockRejectedValue(error);
    expect(await run({}, true)).toEqual({
      ok: false,
      error: expect.stringContaining('Nic nie zostało zapisane'),
    });
    expect(mocks.log).toHaveBeenCalledWith(
      '[account/import] Failed to commit imported data.',
      error,
    );
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
