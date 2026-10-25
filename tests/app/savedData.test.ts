// @vitest-environment node
import * as actions from '@/app/actions/savedData';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  });
  return {
    user: vi.fn(),
    limit: vi.fn(),
    tax: vi.fn(),
    sanitize: vi.fn(),
    validate: vi.fn(),
    calculate: vi.fn(),
    parseParty: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    encryptJson: vi.fn(),
    reserve: vi.fn(),
    verify: vi.fn(),
    revalidate: vi.fn(),
    invoice: model(),
    party: model(),
    bank: model(),
  };
});

vi.mock('@/lib/currentUser', () => ({ getCurrentUserIdWithTerms: mocks.user }));
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: mocks.limit }));
vi.mock('@/lib/invoice/taxParams', () => ({ getAllTaxParams: mocks.tax }));
vi.mock('@/lib/invoice/sanitizeInvoiceForm', () => ({
  sanitizeInvoiceForm: mocks.sanitize,
}));
vi.mock('@/lib/invoice/parseParty', () => ({ parseParty: mocks.parseParty }));
vi.mock('@/lib/invoice/calculateInvoice', () => ({
  calculateInvoice: mocks.calculate,
}));
vi.mock('@/lib/invoice/validateInvoiceForm', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/lib/invoice/validateInvoiceForm')
  >()),
  validateInvoiceForm: mocks.validate,
}));
vi.mock('@/lib/invoice/invoiceNumbering', () => ({
  getInvoiceNumberScope: (id: string | null) =>
    id ? `user:${id}` : 'anonymous',
  reserveInvoiceNumberForScope: mocks.reserve,
  isReservationForScope: mocks.verify,
}));
vi.mock('@/lib/savedDataCrypto', () => ({
  encryptText: mocks.encrypt,
  encryptJson: mocks.encryptJson,
  decryptJson: mocks.decrypt,
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    invoice: mocks.invoice,
    savedParty: mocks.party,
    userBankAccount: mocks.bank,
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));

const base = SAMPLE_INVOICE_PRESETS[0].formData;
const reservation = { number: '7/2026', token: 'signed' };
const bank = {
  accountHolder: ' Jan ',
  bankName: ' Bank ',
  accountNumber: 'PL61 1090-1014 0000 0712 1981 2874',
};
const party = {
  kind: 'CLIENT',
  clientType: 'company',
  name: 'Firma',
  address: 'Adres',
  nip: '123',
  pesel: null,
};
const denied = { ok: false, error: 'Zaloguj się, aby zapisywać dane.' };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21'));
  mocks.user.mockResolvedValue('user-1');
  mocks.limit.mockResolvedValue({ ok: true });
  mocks.tax.mockImplementation(async () => [{ ...DEFAULT_TAX_PARAMS }]);
  mocks.sanitize.mockImplementation((value: unknown) => value);
  mocks.validate.mockReturnValue([]);
  mocks.calculate.mockReturnValue({
    calculations: { net: 4000, taxableBase: 3000 },
  });
  mocks.encrypt.mockImplementation((value: string) => `encrypted:${value}`);
  mocks.encryptJson.mockReturnValue('encrypted-form');
  mocks.decrypt.mockImplementation((data: unknown) => ({ data }));
  mocks.reserve.mockResolvedValue(reservation);
  mocks.verify.mockReturnValue(true);
  mocks.parseParty.mockReturnValue({ ok: true, party });
  mocks.invoice.findMany.mockResolvedValue([]);
  mocks.invoice.findFirst.mockResolvedValue({ invoiceNumber: '1/2026' });
  mocks.invoice.create.mockResolvedValue({ id: 'invoice-1' });
  mocks.invoice.updateMany.mockResolvedValue({ count: 1 });
  mocks.invoice.deleteMany.mockResolvedValue({ count: 2 });
  mocks.party.count.mockResolvedValue(0);
  mocks.party.create.mockResolvedValue({ id: 'party-1' });
  mocks.party.updateMany.mockResolvedValue({ count: 1 });
  mocks.party.deleteMany.mockResolvedValue({ count: 3 });
});
afterEach(() => vi.useRealTimers());

describe('saved data access gates', () => {
  it.each([
    ['income', () => actions.getYearToDateInvoiceTaxableIncome(2026)],
    ['save', () => actions.saveInvoice(base)],
    ['delete', () => actions.deleteInvoice('invoice-1')],
    ['party save', () => actions.saveParty(party)],
    ['party update', () => actions.updateParty('party-1', party)],
    ['party delete', () => actions.deleteParty('party-1')],
    ['all invoices', () => actions.deleteAllInvoices()],
    ['all parties', () => actions.deleteAllParties()],
    ['bank', () => actions.saveUserBankAccountAction(bank)],
  ] as const)('requires authentication for %s', async (_label, run) => {
    mocks.user.mockResolvedValue(null);
    expect(await run()).toEqual(denied);
    expect(mocks.invoice.create).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it.each([
    ['income', () => actions.getYearToDateInvoiceTaxableIncome(2026)],
    ['reserve', () => actions.reserveInvoiceNumber(2026)],
    ['save', () => actions.saveInvoice(base)],
    ['party', () => actions.saveParty(party)],
    ['bank', () => actions.saveUserBankAccountAction(bank)],
  ] as const)('rate-limits %s', async (_label, run) => {
    mocks.limit.mockResolvedValue({ ok: false, message: 'Limit' });
    expect(await run()).toEqual({ ok: false, error: 'Limit' });
    expect(mocks.invoice.create).not.toHaveBeenCalled();
    expect(mocks.bank.upsert).not.toHaveBeenCalled();
  });
});

describe('yearly taxable income and numbering', () => {
  it.each([1999, 10000, 2026.5, NaN])(
    'rejects invalid year %s',
    async (year) => {
      expect(
        await actions.getYearToDateInvoiceTaxableIncome(year),
      ).toMatchObject({ ok: false });
      expect(await actions.reserveInvoiceNumber(year)).toMatchObject({
        ok: false,
      });
      expect(mocks.invoice.findMany).not.toHaveBeenCalled();
      expect(mocks.reserve).not.toHaveBeenCalled();
    },
  );

  it('rejects an overlong excluded invoice id', async () => {
    expect(
      await actions.getYearToDateInvoiceTaxableIncome(2026, 'x'.repeat(101)),
    ).toMatchObject({ ok: false });
    expect(mocks.invoice.findMany).not.toHaveBeenCalled();
  });

  it('reports missing tax parameters', async () => {
    mocks.tax.mockResolvedValue([{ ...DEFAULT_TAX_PARAMS, year: 2027 }]);
    expect(await actions.getYearToDateInvoiceTaxableIncome(2026)).toEqual({
      ok: false,
      error: expect.stringContaining('Brak parametrów podatkowych'),
    });
  });

  it.each([undefined, '', 'excluded-id'])(
    'scopes the sum to owner and year, excluding %s',
    async (excludedId) => {
      mocks.invoice.findMany.mockResolvedValue([
        { data: base },
        { data: base },
      ]);
      mocks.calculate
        .mockReturnValueOnce({ calculations: { taxableBase: 1000 } })
        .mockReturnValueOnce({ calculations: { taxableBase: 2000 } });
      expect(
        await actions.getYearToDateInvoiceTaxableIncome(2026, excludedId),
      ).toEqual({ ok: true, data: 3000 });
      expect(mocks.invoice.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          periodStart: { startsWith: '2026-' },
          ...(excludedId ? { id: { not: excludedId } } : {}),
        },
        select: { data: true },
      });
      expect(mocks.calculate).toHaveBeenCalledWith(
        {
          ...base,
          yearToDateTaxableIncome: 0,
          yearToDateEmploymentIncome: 0,
          noTaxAdvanceRequest: false,
          taxReduction: false,
        },
        DEFAULT_TAX_PARAMS,
      );
    },
  );

  it('rejects unreadable saved invoices instead of understating income', async () => {
    mocks.invoice.findMany.mockResolvedValue([{ data: {} }]);
    mocks.sanitize.mockReturnValue(null);
    expect(await actions.getYearToDateInvoiceTaxableIncome(2026)).toEqual({
      ok: false,
      error: expect.stringContaining('Nie udało się odczytać'),
    });
  });

  it.each(['user-1', null])(
    'reserves numbers for the correct authenticated or anonymous scope %s',
    async (id) => {
      mocks.user.mockResolvedValue(id);
      expect(await actions.reserveInvoiceNumber(2026)).toEqual({
        ok: true,
        data: reservation,
      });
      expect(mocks.reserve).toHaveBeenCalledWith(
        id ? 'user:user-1' : 'anonymous',
        2026,
      );
      expect(mocks.limit).toHaveBeenCalledWith('reserveNumber', id);
    },
  );
});

describe('saving invoices', () => {
  it('rejects invalid sanitized data', async () => {
    mocks.sanitize.mockReturnValue(null);
    expect(await actions.saveInvoice({})).toEqual({
      ok: false,
      error: 'Nieprawidłowe dane formularza.',
    });
    expect(mocks.invoice.create).not.toHaveBeenCalled();
  });

  it('rejects missing tax parameters and validation errors', async () => {
    mocks.tax.mockResolvedValueOnce([]);
    expect(await actions.saveInvoice(base)).toEqual({
      ok: false,
      error: 'Brak parametrów podatkowych dla roku 2026.',
    });
    mocks.validate.mockReturnValue(['First error', 'Second error']);
    expect(await actions.saveInvoice(base)).toEqual({
      ok: false,
      error: 'First error',
    });
    expect(mocks.invoice.create).not.toHaveBeenCalled();
  });

  it('creates encrypted invoices with owner, UID and reserved number', async () => {
    expect(await actions.saveInvoice(base)).toEqual({
      ok: true,
      data: { id: 'invoice-1', invoiceNumber: reservation.number },
    });
    expect(mocks.invoice.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        uid: expect.stringMatching(/^[0-9a-f-]{36}$/),
        invoiceNumber: reservation.number,
        title: 'encrypted:Rachunek 2026-03-01',
        contractNumber: null,
        issuePlace: 'Warszawa',
        issueDate: '2026-03-31',
        periodStart: base.periodStart,
        net: 4000,
        data: 'encrypted-form',
      },
      select: { id: true, invoiceNumber: true },
    });
    expect(mocks.reserve).toHaveBeenCalledWith('user:user-1', 2026);
  });

  it('uses a valid signed reservation instead of allocating another number', async () => {
    await actions.saveInvoice(base, undefined, reservation);
    expect(mocks.verify).toHaveBeenCalledWith(reservation, 'user:user-1', 2026);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it.each(['7/bad', '7/2026'])(
    'rejects invalid reservations %s',
    async (number) => {
      mocks.verify.mockReturnValue(false);
      expect(
        await actions.saveInvoice(base, undefined, {
          number,
          token: 'invalid',
        }),
      ).toEqual({ ok: false, error: 'Numer rachunku jest nieprawidłowy.' });
      expect(mocks.invoice.create).not.toHaveBeenCalled();
    },
  );

  it('updates only the owner invoice and preserves its number', async () => {
    expect(
      await actions.saveInvoice(
        { ...base, contractNumber: ' U/1 ' },
        'invoice-1',
      ),
    ).toEqual({ ok: true, data: { id: 'invoice-1', invoiceNumber: '1/2026' } });
    expect(mocks.invoice.findFirst).toHaveBeenCalledWith({
      where: { id: 'invoice-1', userId: 'user-1' },
      select: { invoiceNumber: true },
    });
    expect(mocks.invoice.updateMany).toHaveBeenCalledWith({
      where: { id: 'invoice-1', userId: 'user-1' },
      data: expect.objectContaining({
        title: 'encrypted:U/1',
        contractNumber: 'encrypted: U/1 ',
        invoiceNumber: '1/2026',
      }),
    });
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it('allocates a number when updating a legacy unnumbered invoice', async () => {
    mocks.invoice.findFirst.mockResolvedValue({ invoiceNumber: null });
    expect(await actions.saveInvoice(base, 'invoice-1')).toEqual({
      ok: true,
      data: { id: 'invoice-1', invoiceNumber: reservation.number },
    });
    expect(mocks.reserve).toHaveBeenCalledWith('user:user-1', 2026);
  });

  it.each(['not-found', 'deleted-concurrently', 'long-id'])(
    'does not report a successful update for %s',
    async (kind) => {
      if (kind === 'not-found') mocks.invoice.findFirst.mockResolvedValue(null);
      if (kind === 'deleted-concurrently')
        mocks.invoice.updateMany.mockResolvedValue({ count: 0 });
      expect(
        await actions.saveInvoice(
          base,
          kind === 'long-id' ? 'x'.repeat(101) : 'invoice-1',
        ),
      ).toMatchObject({ ok: false });
      expect(mocks.invoice.create).not.toHaveBeenCalled();
    },
  );

  it('stores missing optional issue details as null', async () => {
    await actions.saveInvoice({
      ...base,
      issuePlace: undefined,
      issueDate: undefined,
    });
    expect(mocks.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ issuePlace: null, issueDate: null }),
      select: expect.any(Object),
    });
  });

  it('optionally saves normalized encrypted payout details to the profile', async () => {
    await actions.saveInvoice(base, undefined, undefined, true);
    const values = {
      accountHolder: `encrypted:${base.bankAccountHolder}`,
      bankName: `encrypted:${base.bankName}`,
      accountNumber: 'encrypted:61109010140000071219812874',
    };
    expect(mocks.bank.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', ...values },
      update: values,
    });
    expect(mocks.revalidate).toHaveBeenCalledWith('/account');
  });

  it.each<Partial<InvoiceFormData>>([
    { paymentMethod: 'CASH' },
    { transferTarget: 'DECLARATION' },
    { bankAccountNumber: '' },
    { bankName: '' },
    { bankAccountHolder: '' },
    { bankAccountNumber: 'invalid' },
  ])('does not save unusable bank data %j', async (overrides) => {
    await actions.saveInvoice(
      { ...base, ...overrides },
      undefined,
      undefined,
      true,
    );
    expect(mocks.bank.upsert).not.toHaveBeenCalled();
  });
});

describe('saved parties and deletions', () => {
  it.each([
    ['invoice', actions.deleteInvoice, mocks.invoice.deleteMany],
    ['party', actions.deleteParty, mocks.party.deleteMany],
  ] as const)(
    'validates ids and scopes %s deletions',
    async (_label, remove, fn) => {
      for (const id of ['', 'x'.repeat(101)])
        expect(await remove(id)).toMatchObject({ ok: false });
      expect(fn).not.toHaveBeenCalled();
      expect(await remove('record-1')).toEqual({
        ok: true,
        data: _label === 'invoice' ? 2 : 3,
      });
      expect(fn).toHaveBeenCalledWith({
        where: { id: 'record-1', userId: 'user-1' },
      });
      fn.mockResolvedValue({ count: 0 });
      expect(await remove('missing')).toMatchObject({ ok: false });
      expect(mocks.revalidate).toHaveBeenCalledWith('/account/invoices');
    },
  );

  it.each([
    ['invoices', actions.deleteAllInvoices, mocks.invoice.deleteMany, 2],
    ['parties', actions.deleteAllParties, mocks.party.deleteMany, 3],
  ] as const)(
    'deletes all %s for the current owner only',
    async (_label, remove, fn, count) => {
      expect(await remove()).toEqual({ ok: true, data: count });
      expect(fn).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(mocks.revalidate).toHaveBeenCalledWith('/account/invoices');
    },
  );

  it('returns party validation errors for create and update', async () => {
    mocks.parseParty.mockReturnValue({ ok: false, error: 'Invalid party' });
    expect(await actions.saveParty({})).toEqual({
      ok: false,
      error: 'Invalid party',
    });
    expect(await actions.updateParty('party-1', {})).toEqual({
      ok: false,
      error: 'Invalid party',
    });
    expect(mocks.party.create).not.toHaveBeenCalled();
    expect(mocks.party.updateMany).not.toHaveBeenCalled();
  });

  it('enforces the saved-party limit', async () => {
    mocks.party.count.mockResolvedValue(100);
    expect(await actions.saveParty(party)).toEqual({
      ok: false,
      error: 'Osiągnięto limit zapisanych danych (100).',
    });
    expect(mocks.party.count).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(mocks.party.create).not.toHaveBeenCalled();
  });

  it.each([{ ...party }, { ...party, nip: null, pesel: '90010112345' }])(
    'encrypts nullable party fields on create and update %j',
    async (parsed) => {
      mocks.parseParty.mockReturnValue({ ok: true, party: parsed });
      const values = {
        kind: parsed.kind,
        clientType: parsed.clientType,
        label: 'encrypted:Firma',
        name: 'encrypted:Firma',
        address: 'encrypted:Adres',
        nip: parsed.nip === null ? null : `encrypted:${parsed.nip}`,
        pesel: parsed.pesel === null ? null : `encrypted:${parsed.pesel}`,
      };
      expect(await actions.saveParty(parsed)).toEqual({
        ok: true,
        data: { id: 'party-1' },
      });
      expect(mocks.party.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', ...values },
      });
      expect(await actions.updateParty('party-1', parsed)).toEqual({
        ok: true,
        data: undefined,
      });
      expect(mocks.party.updateMany).toHaveBeenCalledWith({
        where: { id: 'party-1', userId: 'user-1' },
        data: values,
      });
    },
  );

  it('rejects invalid or missing party update targets', async () => {
    for (const id of ['', 'x'.repeat(101)])
      expect(await actions.updateParty(id, party)).toMatchObject({ ok: false });
    expect(mocks.party.updateMany).not.toHaveBeenCalled();
    mocks.party.updateMany.mockResolvedValue({ count: 0 });
    expect(await actions.updateParty('missing', party)).toEqual({
      ok: false,
      error: 'Nie znaleziono wpisu.',
    });
  });
});

describe('bank action', () => {
  it.each([
    { accountHolder: '' },
    { accountHolder: 'x'.repeat(201) },
    { bankName: '' },
    { bankName: 'x'.repeat(101) },
    { accountNumber: 'invalid' },
  ])('rejects invalid bank values %j', async (overrides) => {
    expect(
      await actions.saveUserBankAccountAction({ ...bank, ...overrides }),
    ).toMatchObject({ ok: false });
    expect(mocks.bank.upsert).not.toHaveBeenCalled();
  });

  it('returns normalized plaintext DTO but persists encrypted values', async () => {
    const data = {
      accountHolder: 'Jan',
      bankName: 'Bank',
      accountNumber: '61109010140000071219812874',
    };
    expect(await actions.saveUserBankAccountAction(bank)).toEqual({
      ok: true,
      data,
    });
    const encrypted = {
      accountHolder: 'encrypted:Jan',
      bankName: 'encrypted:Bank',
      accountNumber: `encrypted:${data.accountNumber}`,
    };
    expect(mocks.bank.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', ...encrypted },
      update: encrypted,
    });
    expect(mocks.revalidate.mock.calls).toEqual([['/account'], ['/generator']]);
  });
});
