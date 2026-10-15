import { prisma } from '@/lib/db';
import {
  getInvoiceNumberScope,
  reserveInvoiceNumberForScope,
} from '@/lib/invoice/invoiceNumbering';
import { sanitizeInvoiceForm } from '@/lib/invoice/sanitizeInvoiceForm';
import {
  decryptJson,
  decryptLegacyText,
  decryptText,
  encryptJson,
  encryptText,
} from '@/lib/savedDataCrypto';
import type { SavedPartyDto, UserBankAccountDto } from '@/types/savedData';
import 'server-only';

export async function getUserBankAccount(
  userId: string,
): Promise<UserBankAccountDto | null> {
  const row = await prisma.userBankAccount.findUnique({ where: { userId } });
  if (!row) return null;
  return {
    accountHolder: decryptText(row.accountHolder),
    bankName: decryptText(row.bankName),
    accountNumber: decryptText(row.accountNumber),
  };
}

export async function getSavedPartiesForUser(
  userId: string,
): Promise<SavedPartyDto[]> {
  const rows = await prisma.savedParty.findMany({
    where: { userId },
    orderBy: { label: 'asc' },
  });

  return Promise.all(
    rows.map(async (row) => {
      const label = decryptLegacyText(row.label);
      const name = decryptLegacyText(row.name);
      const address = decryptLegacyText(row.address);
      const nip = decryptLegacyText(row.nip);
      const pesel = decryptLegacyText(row.pesel);
      if (label.data === null || name.data === null || address.data === null) {
        throw new Error('Saved party data is missing a required field.');
      }
      if (
        label.needsEncryption ||
        name.needsEncryption ||
        address.needsEncryption ||
        nip.needsEncryption ||
        pesel.needsEncryption
      ) {
        await prisma.savedParty.updateMany({
          where: {
            id: row.id,
            userId,
            label: row.label,
            name: row.name,
            address: row.address,
            nip: row.nip,
            pesel: row.pesel,
          },
          data: {
            label: encryptText(label.data),
            name: encryptText(name.data),
            address: encryptText(address.data),
            nip: nip.data === null ? null : encryptText(nip.data),
            pesel: pesel.data === null ? null : encryptText(pesel.data),
          },
        });
      }

      return {
        id: row.id,
        kind: row.kind,
        label: label.data ?? '',
        clientType: row.clientType as SavedPartyDto['clientType'],
        name: name.data ?? '',
        address: address.data ?? '',
        nip: nip.data,
        pesel: pesel.data,
      };
    }),
  );
}

export async function getSavedInvoiceForUser(userId: string, id: string) {
  const row = await prisma.invoice.findFirst({
    where: { id, userId },
    select: { id: true, data: true, updatedAt: true, invoiceNumber: true },
  });
  if (!row) return null;

  const decrypted = decryptJson(row.data);
  if (decrypted.needsEncryption) {
    await prisma.invoice.updateMany({
      where: { id, userId, updatedAt: row.updatedAt },
      data: { data: encryptJson(decrypted.data) },
    });
  }

  const invoiceNumber =
    row.invoiceNumber ??
    (
      await reserveInvoiceNumberForScope(
        getInvoiceNumberScope(userId),
        new Date().getFullYear(),
      )
    ).number;
  if (!row.invoiceNumber) {
    await prisma.invoice.updateMany({
      where: { id, userId, invoiceNumber: null },
      data: { invoiceNumber },
    });
  }

  return {
    id: row.id,
    invoiceNumber,
    data: sanitizeInvoiceForm(decrypted.data),
  };
}

export async function getSavedInvoicesForUser(userId: string) {
  const rows = await prisma.invoice.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  return Promise.all(
    rows.map(async (row) => {
      const title = decryptLegacyText(row.title);
      const contractNumber = decryptLegacyText(row.contractNumber);
      const storedData = decryptJson(row.data);
      const invoiceNumber =
        row.invoiceNumber ??
        (
          await reserveInvoiceNumberForScope(
            getInvoiceNumberScope(userId),
            new Date().getFullYear(),
          )
        ).number;
      if (!row.invoiceNumber) {
        await prisma.invoice.updateMany({
          where: { id: row.id, userId, invoiceNumber: null },
          data: { invoiceNumber },
        });
      }
      const dataNeedsEncryption =
        storedData.needsEncryption &&
        typeof storedData.data === 'object' &&
        storedData.data !== null;

      if (
        title.needsEncryption ||
        contractNumber.needsEncryption ||
        dataNeedsEncryption
      ) {
        await prisma.invoice.updateMany({
          where: { id: row.id, userId, updatedAt: row.updatedAt },
          data: {
            ...(title.needsEncryption && title.data !== null
              ? { title: encryptText(title.data) }
              : {}),
            ...(contractNumber.needsEncryption && contractNumber.data !== null
              ? { contractNumber: encryptText(contractNumber.data) }
              : {}),
            ...(dataNeedsEncryption
              ? { data: encryptJson(storedData.data) }
              : {}),
          },
        });
      }

      return {
        ...row,
        invoiceNumber,
        title: title.data ?? '',
        contractNumber: contractNumber.data,
      };
    }),
  );
}
