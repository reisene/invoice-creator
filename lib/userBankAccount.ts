import { prisma } from '@/lib/db';
import { encryptText } from '@/lib/savedDataCrypto';

export async function upsertUserBankAccount(
  userId: string,
  account: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
  },
) {
  const encryptedAccount = {
    accountHolder: encryptText(account.accountHolder),
    bankName: encryptText(account.bankName),
    accountNumber: encryptText(account.accountNumber),
  };

  await prisma.userBankAccount.upsert({
    where: { userId },
    create: { userId, ...encryptedAccount },
    update: encryptedAccount,
  });
}
