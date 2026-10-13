import { Resend } from 'resend';
import { siteUrl } from './siteUrl';

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const DEFAULT_FROM = 'Invoice Creator <kontakt@mail.draugskoll.dev>';
const DEFAULT_NOTIFY = 'kprinny@gmail.com';
const DEFAULT_REPLY_TO = 'kontakt@mail.draugskoll.dev';

function getFromEmail(): string {
  return process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;
}

function getNotifyEmail(): string {
  return process.env.CONTACT_NOTIFY_EMAIL || DEFAULT_NOTIFY;
}

function getReplyToEmail(): string {
  return process.env.CONTACT_REPLY_TO || DEFAULT_REPLY_TO;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ContactEmailPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string;
  userId?: string | null;
}

/**
 * Wysyła powiadomienie do administratora/twórcy o nowej wiadomości z formularza
 */
export async function sendAdminContactNotification(
  payload: ContactEmailPayload,
) {
  if (!resend) {
    console.warn(
      '[email] RESEND_API_KEY nie jest skonfigurowany. Pomijam wysyłkę powiadomienia admina.',
    );
    return { ok: false, skipped: true };
  }

  const { name, email, subject, message, category, userId } = payload;
  const escapedMessage = escapeHtml(message).replace(/\n/g, '<br />');

  try {
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: [getNotifyEmail()],
      replyTo: `${name} <${email}>`,
      subject: `[Formularz kontaktowy] ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #212529; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e9ecef; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0d6efd; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;">Nowa wiadomość z formularza kontaktowego</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6c757d; width: 140px; font-weight: 600;">Od:</td>
              <td style="padding: 6px 0; color: #212529; font-weight: 500;">${escapeHtml(name)} &lt;<a href="mailto:${escapeHtml(email)}" style="color: #0d6efd;">${escapeHtml(email)}</a>&gt;</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6c757d; font-weight: 600;">Temat:</td>
              <td style="padding: 6px 0; color: #212529;">${escapeHtml(subject)}</td>
            </tr>
            ${
              category
                ? `
            <tr>
              <td style="padding: 6px 0; color: #6c757d; font-weight: 600;">Kategoria:</td>
              <td style="padding: 6px 0; color: #212529;">${escapeHtml(category)}</td>
            </tr>
            `
                : ''
            }
            ${
              userId
                ? `
            <tr>
              <td style="padding: 6px 0; color: #6c757d; font-weight: 600;">ID użytkownika:</td>
              <td style="padding: 6px 0; color: #212529; font-family: monospace;">${escapeHtml(userId)}</td>
            </tr>
            `
                : ''
            }
          </table>

          <div style="background-color: #f8f9fa; border-left: 4px solid #0d6efd; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <div style="font-weight: 600; font-size: 13px; color: #6c757d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Treść wiadomości:</div>
            <div style="font-size: 15px; color: #212529; white-space: pre-wrap;">${escapedMessage}</div>
          </div>

          <p style="font-size: 13px; color: #6c757d; margin-bottom: 0;">
            Wiadomość została wysłana z serwisu <a href="${siteUrl}" style="color: #0d6efd;">Invoice Creator</a>. Możesz odpowiedzieć bezpośrednio na tę wiadomość e-mail.
          </p>
        </div>
      `,
    });

    return { ok: true, id: result.data?.id };
  } catch (error) {
    console.error(
      '[email] Błąd wysyłania powiadomienia admina przez Resend:',
      error,
    );
    return { ok: false, error };
  }
}

/**
 * Wysyła potwierdzenie przyjęcia wiadomości do użytkownika
 */
export async function sendUserContactConfirmation(
  payload: ContactEmailPayload,
) {
  if (!resend) {
    console.warn(
      '[email] RESEND_API_KEY nie jest skonfigurowany. Pomijam wysyłkę potwierdzenia do użytkownika.',
    );
    return { ok: false, skipped: true };
  }

  const { name, email, subject, message } = payload;
  const escapedMessage = escapeHtml(message).replace(/\n/g, '<br />');

  try {
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: [`${name} <${email}>`],
      replyTo: getReplyToEmail(),
      subject: `Potwierdzenie przyjęcia zgłoszenia: ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #212529; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e9ecef; border-radius: 12px; background-color: #ffffff;">
          <div style="margin-bottom: 20px;">
            <span style="display: inline-block; padding: 6px 12px; background-color: #e7f1ff; color: #0d6efd; border-radius: 20px; font-size: 13px; font-weight: 600;">Invoice Creator</span>
          </div>

          <h2 style="color: #212529; margin-top: 0; font-size: 20px;">Cześć ${escapeHtml(name)},</h2>
          
          <p style="font-size: 15px; color: #495057;">
            Dziękujemy za kontakt! Twoja wiadomość została pomyślnie zarejestrowana w naszym systemie.
          </p>

          <p style="font-size: 15px; color: #495057;">
            Staramy się odpowiadać na wszystkie pytania tak szybko, jak to możliwe (zazwyczaj w ciągu <strong>24–48 godzin</strong>).
          </p>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #e9ecef;">
            <div style="font-weight: 600; font-size: 13px; color: #6c757d; margin-bottom: 8px;">KOPIA TWOJEJ WIADOMOŚCI:</div>
            <div style="font-weight: 600; font-size: 14px; color: #212529; margin-bottom: 6px;">${escapeHtml(subject)}</div>
            <div style="font-size: 14px; color: #495057; white-space: pre-wrap;">${escapedMessage}</div>
          </div>

          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 24px 0;" />

          <p style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">
            Pozdrawiamy,<br />
            <strong>Zespół Invoice Creator</strong>
          </p>
          <p style="font-size: 12px; color: #adb5bd; margin-top: 12px; margin-bottom: 0;">
            Jeśli chcesz uzupełnić swoje zgłoszenie, po prostu odpowiedz na tę wiadomość.
          </p>
        </div>
      `,
    });

    return { ok: true, id: result.data?.id };
  } catch (error) {
    console.error(
      '[email] Błąd wysyłania potwierdzenia do użytkownika przez Resend:',
      error,
    );
    return { ok: false, error };
  }
}
