/**
 * Kody instytucji bankowych w Polsce (pozycje 3-6 w 26-cyfrowym numerze NRB).
 */
export const POLISH_BANK_CODES: Record<string, string> = {
  '1010': 'Narodowy Bank Polski',
  '1020': 'PKO Bank Polski',
  '1030': 'Citi Handlowy',
  '1050': 'ING Bank Śląski',
  '1060': 'Bank BPH',
  '1090': 'Santander Bank Polska',
  '1130': 'Bank Gospodarstwa Krajowego',
  '1140': 'mBank',
  '1160': 'Bank Millennium',
  '1220': 'Bank Handlowy w Warszawie',
  '1240': 'Bank Pekao S.A.',
  '1320': 'Bank Pocztowy',
  '1440': 'PKO BP',
  '1470': 'Euro Bank',
  '1540': 'BOŚ Bank',
  '1580': 'Mercedes-Benz Bank',
  '1600': 'BNP Paribas Bank Polska',
  '1610': 'SGB-Bank',
  '1670': 'RBS Bank Polska',
  '1680': 'Plus Bank',
  '1840': 'Société Générale',
  '1870': 'Nest Bank',
  '1910': 'Deutsche Bank Polska',
  '1930': 'Bank Polskiej Spółdzielczości (BPS)',
  '1940': 'Credit Agricole',
  '1950': 'Idea Bank',
  '2000': 'Rabobank Polska',
  '2030': 'BNP Paribas',
  '2120': 'Santander Consumer Bank',
  '2160': 'Toyota Bank',
  '2190': 'DNB Bank Polska',
  '2480': 'VeloBank',
  '2490': 'Alior Bank',
  // Instytucje płatnicze / Fintechy udostępniające polskie rachunki NRB (często przez banki partnerskie)
  // Użytkownicy Revoluta, ZEN itp. mogą także wpisać dowolną własną nazwę banku / instytucji w formularzu
};

/**
 * Usuwa białe znaki, myślniki i opcjonalny przedrostek "PL".
 * Zwraca same cyfry (maksymalnie 26).
 */
export function cleanPolishBankAccount(value: string): string {
  return value
    .replace(/[\s-]/g, '')
    .toUpperCase()
    .replace(/^PL/, '')
    .replace(/\D/g, '')
    .slice(0, 26);
}

/**
 * Formatuje numer rachunku bankowego w standardowym polskim formacie:
 * XX XXXX XXXX XXXX XXXX XXXX XXXX (2 + 6x4 cyfry)
 */
export function formatPolishBankAccount(value: string): string {
  const digits = cleanPolishBankAccount(value);
  if (!digits) return '';
  if (digits.length <= 2) return digits;

  const parts: string[] = [digits.slice(0, 2)];
  for (let i = 2; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

/**
 * Rozpoznaje nazwę banku po 4-cyfrowym kodzie instytucji (pozycje 3–6 w numerze rachunku).
 */
export function getPolishBankName(accountNumber: string): string | null {
  const digits = cleanPolishBankAccount(accountNumber);
  if (digits.length < 6) return null;
  const bankCode = digits.slice(2, 6);
  return POLISH_BANK_CODES[bankCode] ?? null;
}
