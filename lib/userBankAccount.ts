import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/db';
import { encryptText } from '@/lib/savedDataCrypto';

export async function upsertUserBankAccount(
  userId: string,
  account: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
  },
  db: Pick<Prisma.TransactionClient, 'userBankAccount'> = prisma,
) {
  const encryptedAccount = {
    accountHolder: encryptText(account.accountHolder),
    bankName: encryptText(account.bankName),
    accountNumber: encryptText(account.accountNumber),
  };

  await db.userBankAccount.upsert({
    where: { userId },
    create: { userId, ...encryptedAccount },
    update: encryptedAccount,
  });
}
