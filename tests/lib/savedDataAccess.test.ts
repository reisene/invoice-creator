// @vitest-environment node
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import {
  getSavedInvoiceForUser,
  getSavedInvoicesForUser,
  getSavedPartiesForUser,
  getUserBankAccount,
} from '@/lib/savedDataAccess';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bank: vi.fn(),
  parties: vi.fn(),
  partyUpdate: vi.fn(),
  invoice: vi.fn(),
  invoices: vi.fn(),
  invoiceUpdate: vi.fn(),
  decrypt: vi.fn(),
  legacy: vi.fn(),
  json: vi.fn(),
  encrypt: vi.fn(),
  encryptJson: vi.fn(),
  reserve: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    userBankAccount: { findUnique: mocks.bank },
    savedParty: { findMany: mocks.parties, updateMany: mocks.partyUpdate },
    invoice: {
      findFirst: mocks.invoice,
      findMany: mocks.invoices,
      updateMany: mocks.invoiceUpdate,
    },
  },
}));
vi.mock('@/lib/savedDataCrypto', () => ({
  decryptText: mocks.decrypt,
  decryptLegacyText: mocks.legacy,
  decryptJson: mocks.json,
  encryptText: mocks.encrypt,
  encryptJson: mocks.encryptJson,
}));
vi.mock('@/lib/invoice/invoiceNumbering', () => ({
  getInvoiceNumberScope: (id: string) => `user:${id}`,
  reserveInvoiceNumberForScope: mocks.reserve,
}));
const form = SAMPLE_INVOICE_PRESETS[0].formData;
const updatedAt = new Date('2026-01-01T00:00:00Z');
const party = {
  id: 'p1',
  userId: 'u1',
  kind: 'CONTRACTOR',
  clientType: null,
  label: 'Label',
  name: 'Name',
  address: 'Address',
  nip: null,
  pesel: null,
};
const invoice = {
  id: 'i1',
  userId: 'u1',
  title: 'Title',
  contractNumber: 'Contract',
  invoiceNumber: '1/2026',
  data: form,
  updatedAt,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  mocks.decrypt.mockImplementation((text) => `plain:${text}`);
  mocks.legacy.mockImplementation((data) => ({ data, needsEncryption: false }));
  mocks.json.mockImplementation((data) => ({ data, needsEncryption: false }));
  mocks.encrypt.mockImplementation((text) => `encrypted:${text}`);
  mocks.encryptJson.mockReturnValue('encrypted:json');
  mocks.reserve.mockResolvedValue({ number: '2/2026', token: 'signed' });
  mocks.bank.mockResolvedValue(null);
  mocks.parties.mockResolvedValue([]);
  mocks.invoice.mockResolvedValue(null);
  mocks.invoices.mockResolvedValue([]);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('owner-scoped saved data reads', () => {
  it('returns null for missing bank data and decrypts each stored field', async () => {
    expect(await getUserBankAccount('u1')).toBeNull();
    mocks.bank.mockResolvedValue({
      accountHolder: 'holder',
      bankName: 'bank',
      accountNumber: 'number',
    });
    expect(await getUserBankAccount('u1')).toEqual({
      accountHolder: 'plain:holder',
      bankName: 'plain:bank',
      accountNumber: 'plain:number',
    });
    expect(mocks.bank).toHaveBeenLastCalledWith({ where: { userId: 'u1' } });
  });
  it('filters and orders saved parties without migrating already encrypted data', async () => {
    mocks.parties.mockResolvedValue([party]);
    expect(await getSavedPartiesForUser('u1')).toEqual([
      {
        id: 'p1',
        kind: 'CONTRACTOR',
        clientType: null,
        label: 'Label',
        name: 'Name',
        address: 'Address',
        nip: null,
        pesel: null,
      },
    ]);
    expect(mocks.parties).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { label: 'asc' },
    });
    expect(mocks.partyUpdate).not.toHaveBeenCalled();
  });
  it.each(['label', 'name', 'address', 'nip', 'pesel'])(
    'migrates plaintext when %s requires encryption using optimistic owner checks',
    async (field) => {
      const row = { ...party, nip: 'nip', pesel: 'pesel' };
      mocks.parties.mockResolvedValue([row]);
      mocks.legacy.mockImplementation((data) => ({
        data,
        needsEncryption: data === Reflect.get(row, field),
      }));
      await getSavedPartiesForUser('u1');
      expect(mocks.partyUpdate).toHaveBeenCalledWith({
        where: {
          id: 'p1',
          userId: 'u1',
          label: 'Label',
          name: 'Name',
          address: 'Address',
          nip: 'nip',
          pesel: 'pesel',
        },
        data: {
          label: 'encrypted:Label',
          name: 'encrypted:Name',
          address: 'encrypted:Address',
          nip: 'encrypted:nip',
          pesel: 'encrypted:pesel',
        },
      });
    },
  );
  it('preserves null optional identifiers during migration', async () => {
    mocks.parties.mockResolvedValue([party]);
    mocks.legacy.mockImplementation((data) => ({
      data,
      needsEncryption: data !== null,
    }));
    await getSavedPartiesForUser('u1');
    expect(mocks.partyUpdate.mock.calls[0][0].data).toMatchObject({
      nip: null,
      pesel: null,
    });
  });
  it.each(['Label', 'Name', 'Address'])(
    'fails for a missing required decrypted party field %s',
    async (missing) => {
      mocks.parties.mockResolvedValue([party]);
      mocks.legacy.mockImplementation((data) => ({
        data: data === missing ? null : data,
        needsEncryption: false,
      }));
      await expect(getSavedPartiesForUser('u1')).rejects.toThrow(
        'missing a required field',
      );
      expect(mocks.partyUpdate).not.toHaveBeenCalled();
    },
  );
  it('returns null for a missing owner-scoped invoice', async () => {
    expect(await getSavedInvoiceForUser('u1', 'i1')).toBeNull();
    expect(mocks.invoice).toHaveBeenCalledWith({
      where: { id: 'i1', userId: 'u1' },
      select: { id: true, data: true, updatedAt: true, invoiceNumber: true },
    });
  });
  it('sanitizes decrypted invoice data and leaves existing encrypted numbers intact', async () => {
    mocks.invoice.mockResolvedValue(invoice);
    expect(await getSavedInvoiceForUser('u1', 'i1')).toMatchObject({
      id: 'i1',
      invoiceNumber: '1/2026',
      data: form,
    });
    expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
    expect(mocks.reserve).not.toHaveBeenCalled();
    mocks.json.mockReturnValue({
      data: { invalid: true },
      needsEncryption: false,
    });
    expect(await getSavedInvoiceForUser('u1', 'i1')).toHaveProperty(
      'data',
      null,
    );
  });
  it('encrypts legacy invoice data and reserves a missing number with guarded writes', async () => {
    mocks.invoice.mockResolvedValue({ ...invoice, invoiceNumber: null });
    mocks.json.mockReturnValue({ data: form, needsEncryption: true });
    expect(await getSavedInvoiceForUser('u1', 'i1')).toHaveProperty(
      'invoiceNumber',
      '2/2026',
    );
    expect(mocks.reserve).toHaveBeenCalledWith('user:u1', 2026);
    expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: 'i1', userId: 'u1', updatedAt },
      data: { data: 'encrypted:json' },
    });
    expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: 'i1', userId: 'u1', invoiceNumber: null },
      data: { invoiceNumber: '2/2026' },
    });
  });
  it('lists invoices in updated order and decrypts metadata without unnecessary writes', async () => {
    mocks.invoices.mockResolvedValue([invoice]);
    expect(await getSavedInvoicesForUser('u1')).toEqual([invoice]);
    expect(mocks.invoices).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { updatedAt: 'desc' },
    });
    expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
  });
  it('migrates invoice metadata and object data, reserving missing numbers', async () => {
    mocks.invoices.mockResolvedValue([{ ...invoice, invoiceNumber: null }]);
    mocks.legacy.mockImplementation((data) => ({
      data,
      needsEncryption: true,
    }));
    mocks.json.mockReturnValue({ data: form, needsEncryption: true });
    const result = await getSavedInvoicesForUser('u1');
    expect(result[0].invoiceNumber).toBe('2/2026');
    expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: 'i1', userId: 'u1', invoiceNumber: null },
      data: { invoiceNumber: '2/2026' },
    });
    expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: 'i1', userId: 'u1', updatedAt },
      data: {
        title: 'encrypted:Title',
        contractNumber: 'encrypted:Contract',
        data: 'encrypted:json',
      },
    });
  });
  it.each([null, 42, 'legacy'])(
    'does not migrate non-object legacy invoice data %j',
    async (data) => {
      mocks.invoices.mockResolvedValue([
        { ...invoice, title: null, contractNumber: null, data },
      ]);
      mocks.json.mockReturnValue({ data, needsEncryption: true });
      expect((await getSavedInvoicesForUser('u1'))[0]).toMatchObject({
        title: '',
        contractNumber: null,
      });
      expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
    },
  );
  it.each(['Title', 'Contract'])(
    'writes only the changed encrypted invoice metadata %s',
    async (field) => {
      mocks.invoices.mockResolvedValue([invoice]);
      mocks.legacy.mockImplementation((data) => ({
        data,
        needsEncryption: data === field,
      }));
      await getSavedInvoicesForUser('u1');
      expect(mocks.invoiceUpdate.mock.calls[0][0].data).toEqual(
        field === 'Title'
          ? { title: 'encrypted:Title' }
          : { contractNumber: 'encrypted:Contract' },
      );
    },
  );
  it('does not encrypt null legacy metadata even if marked for migration', async () => {
    mocks.invoices.mockResolvedValue([
      { ...invoice, title: null, contractNumber: null },
    ]);
    mocks.legacy.mockReturnValue({ data: null, needsEncryption: true });
    await getSavedInvoicesForUser('u1');
    expect(mocks.invoiceUpdate.mock.calls[0][0].data).toEqual({});
  });
  it('propagates decryption and guarded migration failures', async () => {
    const error = new Error('decryption failed');
    mocks.bank.mockResolvedValue({ accountHolder: 'bad' });
    mocks.decrypt.mockImplementation(() => {
      throw error;
    });
    await expect(getUserBankAccount('u1')).rejects.toBe(error);
    mocks.invoice.mockResolvedValue(invoice);
    mocks.json.mockReturnValue({ data: form, needsEncryption: true });
    mocks.invoiceUpdate.mockRejectedValue(error);
    await expect(getSavedInvoiceForUser('u1', 'i1')).rejects.toBe(error);
  });
});
