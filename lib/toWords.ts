import { toWords } from 'to-words/pl-PL';

export function numberToWords(value: number): string {
  const integer = Math.floor(value);
  const fraction = Math.floor((value - integer) * 100);

  const words = toWords(integer);
  const fractionPart = `${fraction}/100`;

  return `${words} złotych ${fractionPart}`;
}
