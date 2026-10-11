type AuthErrorLike = { code?: string; message?: string; status?: number };

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Nieprawidłowy adres e-mail lub hasło.',
  INVALID_PASSWORD: 'Nieprawidłowe hasło.',
  INVALID_EMAIL: 'Nieprawidłowy adres e-mail.',
  EMAIL_NOT_VERIFIED: 'Adres e-mail nie został zweryfikowany.',
  USER_ALREADY_EXISTS: 'Konto z tym adresem e-mail już istnieje.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'Konto z tym adresem e-mail już istnieje.',
  USER_NOT_FOUND: 'Nie znaleziono konta.',
  PASSWORD_TOO_SHORT: 'Hasło jest zbyt krótkie.',
  PASSWORD_TOO_LONG: 'Hasło jest zbyt długie.',
  INVALID_TOKEN: 'Link jest nieprawidłowy lub wygasł.',
  TOKEN_EXPIRED: 'Link wygasł.',
  INVALID_OTP: 'Kod jest nieprawidłowy lub wygasł.',
  OTP_EXPIRED: 'Kod wygasł. Wyślij nowy kod.',
  TOO_MANY_ATTEMPTS: 'Zbyt wiele prób. Wyślij nowy kod.',
  SESSION_EXPIRED: 'Sesja wygasła. Zaloguj się ponownie.',
  FAILED_TO_CREATE_USER: 'Nie udało się utworzyć konta.',
};

export function authErrorMessage(
  error: AuthErrorLike | null | undefined,
  fallback: string,
): string {
  if (error?.status === 429) {
    return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
  }
  const code = error?.code?.toUpperCase();
  return (code && MESSAGES[code]) || fallback;
}
