import { prisma } from '@/lib/db';
import {
  signInvoiceNumberReservation,
  verifyInvoiceNumberReservation,
} from '@/lib/savedDataCrypto';
import type { InvoiceNumberReservation } from '@/types/savedData';
import 'server-only';

export function getInvoiceNumberScope(userId: string | null): string {
  return userId ? `user:${userId}` : 'anonymous';
}

export async function reserveInvoiceNumberForScope(
  scope: string,
  year: number,
): Promise<InvoiceNumberReservation> {
  const sequence = await prisma.invoiceSequence.upsert({
    where: { scope_year: { scope, year } },
    create: { scope, year, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });
  const number =
    scope === 'anonymous'
      ? `A-${sequence.value}/${year}`
      : `${sequence.value}/${year}`;
  const payload = JSON.stringify([scope, year, number]);

  return {
    number,
    token: signInvoiceNumberReservation(payload),
  };
}

export function isReservationForScope(
  reservation: unknown,
  scope: string,
  year: number,
): boolean {
  if (
    typeof reservation !== 'object' ||
    reservation === null ||
    !('number' in reservation) ||
    typeof reservation.number !== 'string' ||
    !('token' in reservation) ||
    typeof reservation.token !== 'string'
  ) {
    return false;
  }
  const payload = JSON.stringify([scope, year, reservation.number]);
  const expectedNumber =
    scope === 'anonymous' ? /^A-\d+\/\d{4}$/ : /^\d+\/\d{4}$/;
  if (!expectedNumber.test(reservation.number)) return false;
  if (!reservation.number.endsWith(`/${year}`)) return false;

  return verifyInvoiceNumberReservation(payload, reservation.token);
}
