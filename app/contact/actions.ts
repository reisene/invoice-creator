'use server';

import { getCurrentUserId } from '@/lib/currentUser';
import { prisma } from '@/lib/db';
import {
  sendAdminContactNotification,
  sendUserContactConfirmation,
} from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';

export type ContactFormState = {
  ok: boolean;
  message: string;
} | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const userId = await getCurrentUserId();

  // Sprawdzenie limitu zapytań (Upstash Redis)
  const rateLimit = await checkRateLimit('contactForm', userId);
  if (!rateLimit.ok) {
    return { ok: false, message: rateLimit.message };
  }

  // Zabezpieczenie antyspamowe (honeypot - pole ukryte dla ludzi)
  const honeypot = String(formData.get('hp_website') ?? '').trim();
  if (honeypot.length > 0) {
    // Dyskretna symulacja sukcesu dla robotów spamujących
    return {
      ok: true,
      message: 'Twoja wiadomość została przesłana pomyślnie.',
    };
  }

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const customSubject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!name || name.length < 2) {
    return {
      ok: false,
      message: 'Podaj imię i nazwisko (lub nazwę) o długości min. 2 znaków.',
    };
  }
  if (name.length > 100) {
    return {
      ok: false,
      message: 'Imię i nazwisko nie może przekraczać 100 znaków.',
    };
  }

  if (!email || !EMAIL_REGEX.test(email) || email.length > 150) {
    return {
      ok: false,
      message: 'Podaj prawidłowy adres e-mail do kontaktu.',
    };
  }

  const subject = customSubject || category || 'Wiadomość z formularza';
  if (subject.length > 200) {
    return {
      ok: false,
      message: 'Temat wiadomości nie może przekraczać 200 znaków.',
    };
  }

  if (!message || message.length < 10) {
    return {
      ok: false,
      message: 'Wiadomość jest zbyt krótka (wymagane minimum 10 znaków).',
    };
  }
  if (message.length > 5000) {
    return {
      ok: false,
      message: 'Wiadomość przekracza dozwolony limit 5000 znaków.',
    };
  }

  try {
    await prisma.contactMessage.create({
      data: {
        userId: userId ?? null,
        name,
        email,
        subject,
        message,
      },
    });

    // Wysyłka maili przez Resend (powiadomienie do admina + potwierdzenie dla użytkownika)
    // Promise.allSettled gwarantuje, że ewentualny błąd wysyłki nie cofnie zapisu w bazie
    await Promise.allSettled([
      sendAdminContactNotification({
        name,
        email,
        subject,
        message,
        category,
        userId,
      }),
      sendUserContactConfirmation({
        name,
        email,
        subject,
        message,
        category,
        userId,
      }),
    ]);

    return {
      ok: true,
      message:
        'Dziękujemy za kontakt! Twoja wiadomość została pomyślnie przesłana. Odpowiemy na podany adres e-mail najszybciej jak to możliwe.',
    };
  } catch (error) {
    console.error('Błąd zapisu wiadomości kontaktowej:', error);
    return {
      ok: false,
      message:
        'Wystąpił nieoczekiwany błąd podczas wysyłania wiadomości. Spróbuj ponownie za chwilę lub napisz bezpośrednio na e-mail.',
    };
  }
}
