import { toWords } from 'to-words/pl-PL';

function zlotyForm(n: number): string {
  if (n === 1) return 'złoty';
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return 'złote';
  }
  return 'złotych';
}

export function numberToWords(value: number): string {
  const cents = Math.round(value * 100);
  const integer = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');

  const words = integer === 0 ? 'zero' : toWords(integer).toLowerCase();

  return `${words} ${zlotyForm(integer)} ${fraction}/100`;
}
