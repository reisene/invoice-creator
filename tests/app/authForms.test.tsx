import ForgotPasswordForm from '@/app/auth/forgot-password/page';
import MagicLinkForm from '@/app/auth/magic-link/MagicLinkForm';
import ResetPasswordPage from '@/app/auth/reset-password/page';
import SignInForm from '@/app/auth/sign-in/page';
import SignUpForm from '@/app/auth/sign-up/SignUpForm';
import VerifyEmailPage from '@/app/auth/verify-email/page';
import ContactForm from '@/app/contact/ContactForm';
import AcceptanceForm from '@/app/terms/accept/AcceptanceForm';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { act, cleanup, fireEvent, render, screen, waitFor } = testing;

const mocks = vi.hoisted(() => ({
  search: new URLSearchParams(),
  signIn: vi.fn(),
  signup: vi.fn(),
  forgot: vi.fn(),
  reset: vi.fn(),
  magic: vi.fn(),
  verify: vi.fn(),
  resend: vi.fn(),
  accept: vi.fn(),
  contact: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.search }));
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  default: () => <button>Google login</button>,
}));
vi.mock('@/app/auth/sign-in/actions', () => ({
  signInWithEmail: mocks.signIn,
}));
vi.mock('@/app/auth/sign-up/actions', () => ({
  signUpWithEmail: mocks.signup,
}));
vi.mock('@/app/auth/forgot-password/actions', () => ({
  requestPasswordReset: mocks.forgot,
}));
vi.mock('@/app/auth/reset-password/actions', () => ({
  resetPassword: mocks.reset,
}));
vi.mock('@/app/auth/magic-link/actions', () => ({
  requestMagicLink: mocks.magic,
}));
vi.mock('@/app/auth/verify-email/actions', () => ({
  verifyEmailCode: mocks.verify,
  resendVerificationCode: mocks.resend,
}));
vi.mock('@/app/terms/accept/actions', () => ({
  acceptCurrentTerms: mocks.accept,
}));
vi.mock('@/app/contact/actions', () => ({ submitContactForm: mocks.contact }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.search = new URLSearchParams();
});
afterEach(cleanup);

function submit(buttonName: string | RegExp) {
  const button = screen.getByRole('button', { name: buttonName });
  const form = button.closest('form');
  if (!form) throw new Error('Submit button has no form');
  fireEvent.submit(form);
}
function field(name: string, value: string) {
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
}
async function feedback(
  element: ReactElement,
  button: string | RegExp,
  action: typeof mocks.signIn,
  result: unknown,
) {
  action.mockResolvedValue(result);
  render(element);
  submit(button);
  await waitFor(() => expect(action).toHaveBeenCalledOnce());
  return screen.findByRole('alert');
}
async function pending(
  element: ReactElement,
  button: string,
  action: typeof mocks.signIn,
  pendingText: string,
) {
  let resolve!: (value: null) => void;
  action.mockReturnValue(
    new Promise<null>((done) => {
      resolve = done;
    }),
  );
  render(element);
  submit(button);
  await waitFor(() =>
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: pendingText })
        .disabled,
    ).toBe(true),
  );
  await act(async () => {
    resolve(null);
  });
}

describe('authentication form submissions', () => {
  it('submits entered sign-in credentials and displays errors', async () => {
    mocks.search.set('reset', '1');
    mocks.signIn.mockResolvedValue({ error: 'Invalid credentials' });
    render(<SignInForm />);
    expect(
      screen.getByText('Hasło zostało zmienione. Możesz się zalogować.'),
    ).toBeDefined();
    field('Adres e-mail', 'jan@example.com');
    field('Hasło', 'password');
    submit('Zaloguj się');
    expect(await screen.findByText('Invalid credentials')).toBeDefined();
    const data: FormData = mocks.signIn.mock.calls[0][1];
    expect(data.get('email')).toBe('jan@example.com');
    expect(data.get('password')).toBe('password');
  });
  it('shows pending sign-in state', async () => {
    await pending(<SignInForm />, 'Zaloguj się', mocks.signIn, 'Logowanie...');
  });
  it('submits registration consent, current version and optional immediate-start request', async () => {
    mocks.signup.mockResolvedValue({ error: 'Registration failed' });
    render(<SignUpForm termsVersion='2026-01' />);
    field('Imię i nazwisko', 'Jan');
    field('Adres e-mail', 'jan@example.com');
    field('Hasło', 'password');
    fireEvent.click(screen.getByRole('checkbox', { name: /Akceptuję/ }));
    submit('Utwórz konto');
    expect(await screen.findByText('Registration failed')).toBeDefined();
    const data: FormData = mocks.signup.mock.calls[0][1];
    expect(data.get('termsVersion')).toBe('2026-01');
    expect(data.get('acceptTerms')).toBe('accepted');
    expect(data.get('requestImmediateStart')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: /Zarejestruj się linkiem/ })
        .getAttribute('href'),
    ).toBe('/auth/magic-link?mode=signup');
  });
  it('shows pending registration state', async () => {
    await pending(
      <SignUpForm termsVersion='v1' />,
      'Utwórz konto',
      mocks.signup,
      'Tworzenie konta...',
    );
  });
  it('replaces the password-reset request form with non-enumerating confirmation', async () => {
    const alert = await feedback(
      <ForgotPasswordForm />,
      'Wyślij link',
      mocks.forgot,
      { success: true },
    );
    expect(alert.textContent).toContain('Jeśli konto z tym adresem istnieje');
    expect(screen.queryByRole('button', { name: 'Wyślij link' })).toBeNull();
  });
  it('shows password-reset request errors', async () => {
    expect(
      (
        await feedback(<ForgotPasswordForm />, 'Wyślij link', mocks.forgot, {
          error: 'Request failed',
        })
      ).textContent,
    ).toBe('Request failed');
  });
  it('shows pending password-reset request state', async () => {
    await pending(
      <ForgotPasswordForm />,
      'Wyślij link',
      mocks.forgot,
      'Wysyłanie...',
    );
  });
  it('disables reset submission when the token is missing', () => {
    render(<ResetPasswordPage />);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Zmień hasło' })
        .disabled,
    ).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe(
      'Link jest nieprawidłowy lub wygasł.',
    );
  });
  it('submits the token, new password and confirmation and displays errors', async () => {
    mocks.search.set('token', 'reset-token');
    mocks.reset.mockResolvedValue({ error: 'Passwords differ' });
    render(<ResetPasswordPage />);
    field('Nowe hasło', 'new-password');
    field('Powtórz hasło', 'different');
    submit('Zmień hasło');
    expect(await screen.findByText('Passwords differ')).toBeDefined();
    const data: FormData = mocks.reset.mock.calls[0][1];
    expect(data.get('token')).toBe('reset-token');
    expect(data.get('password')).toBe('new-password');
    expect(data.get('confirm')).toBe('different');
  });
  it('shows pending password reset state', async () => {
    mocks.search.set('token', 'token');
    await pending(
      <ResetPasswordPage />,
      'Zmień hasło',
      mocks.reset,
      'Zapisywanie...',
    );
  });
});

describe('magic links and terms', () => {
  it.each(['signin', 'signup'])(
    'submits the correct magic-link mode %s',
    async (mode) => {
      if (mode === 'signup') mocks.search.set('mode', mode);
      mocks.magic.mockResolvedValue({ success: true });
      render(<MagicLinkForm termsVersion='2026-01' />);
      field('Adres e-mail', 'jan@example.com');
      if (mode === 'signup') {
        field('Imię i nazwisko', 'Jan');
        fireEvent.click(screen.getByRole('checkbox', { name: /Akceptuję/ }));
      }
      submit('Wyślij link');
      expect((await screen.findByRole('alert')).textContent).toContain(
        mode === 'signup' ? 'aby utworzyć konto' : 'link do logowania',
      );
      const data: FormData = mocks.magic.mock.calls[0][1];
      expect(data.get('mode')).toBe(mode);
      expect(data.get('termsVersion')).toBe(
        mode === 'signup' ? '2026-01' : null,
      );
      expect(screen.queryByRole('button', { name: 'Wyślij link' })).toBeNull();
    },
  );
  it('reports magic-link errors', async () => {
    expect(
      (
        await feedback(
          <MagicLinkForm termsVersion='v1' />,
          'Wyślij link',
          mocks.magic,
          { error: 'Link failed' },
        )
      ).textContent,
    ).toBe('Link failed');
  });
  it('shows pending magic-link state', async () => {
    await pending(
      <MagicLinkForm termsVersion='v1' />,
      'Wyślij link',
      mocks.magic,
      'Wysyłanie...',
    );
  });
  it('submits the exact accepted terms version', async () => {
    mocks.accept.mockResolvedValue({ error: 'Terms changed' });
    render(<AcceptanceForm termsVersion='2026-01' />);
    fireEvent.click(screen.getByRole('checkbox'));
    submit('Akceptuję i kontynuuję');
    expect(await screen.findByText('Terms changed')).toBeDefined();
    const data: FormData = mocks.accept.mock.calls[0][1];
    expect(data.get('acceptTerms')).toBe('accepted');
    expect(data.get('termsVersion')).toBe('2026-01');
  });
  it('shows pending terms acceptance state', async () => {
    await pending(
      <AcceptanceForm termsVersion='v1' />,
      'Akceptuję i kontynuuję',
      mocks.accept,
      'Zapisywanie...',
    );
  });
});

describe('email verification UI', () => {
  it('disables resending without the email query parameter', () => {
    render(<VerifyEmailPage />);
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Wyślij kod ponownie',
      }).disabled,
    ).toBe(true);
  });
  it('prefills the email, submits OTP, and hides both forms on success', async () => {
    mocks.search.set('email', 'jan@example.com');
    mocks.verify.mockResolvedValue({ ok: true, message: 'Verified' });
    render(<VerifyEmailPage />);
    expect(screen.getByLabelText<HTMLInputElement>('Adres e-mail').value).toBe(
      'jan@example.com',
    );
    field('Kod', '123456');
    submit('Potwierdź');
    expect(await screen.findByText('Verified', { exact: false })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Potwierdź' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Wyślij kod ponownie' }),
    ).toBeNull();
    const data: FormData = mocks.verify.mock.calls[0][1];
    expect(data.get('otp')).toBe('123456');
  });
  it('reports verification errors without removing the form', async () => {
    expect(
      (
        await feedback(<VerifyEmailPage />, 'Potwierdź', mocks.verify, {
          ok: false,
          message: 'Invalid OTP',
        })
      ).textContent,
    ).toBe('Invalid OTP');
    expect(screen.getByRole('button', { name: 'Potwierdź' })).toBeDefined();
  });
  it.each([false, true])(
    'reports resend result ok=%s for the original email',
    async (ok) => {
      mocks.search.set('email', 'jan@example.com');
      const alert = await feedback(
        <VerifyEmailPage />,
        'Wyślij kod ponownie',
        mocks.resend,
        { ok, message: 'Resend result' },
      );
      expect(alert.textContent).toBe('Resend result');
      expect(
        alert.classList.contains(ok ? 'alert-success' : 'alert-danger'),
      ).toBe(true);
      const data: FormData = mocks.resend.mock.calls[0][1];
      expect(data.get('email')).toBe('jan@example.com');
    },
  );
  it('shows pending verification state', async () => {
    await pending(
      <VerifyEmailPage />,
      'Potwierdź',
      mocks.verify,
      'Sprawdzanie...',
    );
  });
  it('shows pending resend state', async () => {
    mocks.search.set('email', 'jan@example.com');
    await pending(
      <VerifyEmailPage />,
      'Wyślij kod ponownie',
      mocks.resend,
      'Wysyłanie...',
    );
  });
});

describe('contact form', () => {
  it('prefills account data and updates the subject hint when category changes', () => {
    render(<ContactForm defaultName='Jan' defaultEmail='jan@example.com' />);
    expect(screen.getByLabelText<HTMLInputElement>(/Twoje imię/).value).toBe(
      'Jan',
    );
    expect(screen.getByLabelText<HTMLInputElement>(/Adres e-mail/).value).toBe(
      'jan@example.com',
    );
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Sugestia funkcji' },
    });
    expect(
      screen.getByLabelText<HTMLInputElement>(/Temat wiadomości/).placeholder,
    ).toBe('np. Sugestia funkcji');
  });
  it('submits contact data and displays server errors', async () => {
    mocks.contact.mockResolvedValue({ ok: false, message: 'Contact failed' });
    render(<ContactForm />);
    field('Twoje imię i nazwisko *', 'Jan');
    field('Adres e-mail *', 'jan@example.com');
    field('Treść wiadomości *', 'Long enough message');
    submit('Wyślij wiadomość');
    expect(await screen.findByText('Contact failed')).toBeDefined();
    const data: FormData = mocks.contact.mock.calls[0][1];
    expect(data.get('name')).toBe('Jan');
    expect(data.get('message')).toBe('Long enough message');
    expect(data.get('hp_website')).toBe('');
  });
  it('shows success and removes the submitted form', async () => {
    mocks.contact.mockResolvedValue({ ok: true, message: 'Message stored' });
    render(<ContactForm />);
    submit('Wyślij wiadomość');
    expect(
      await screen.findByRole('heading', { name: 'Wiadomość wysłana!' }),
    ).toBeDefined();
    expect(screen.getByText('Message stored')).toBeDefined();
    expect(
      screen.queryByRole('button', { name: 'Wyślij wiadomość' }),
    ).toBeNull();
  });
  it('resets the completed form and allows another message without resubmitting the previous one', async () => {
    mocks.contact.mockResolvedValue({ ok: true, message: 'Message stored' });
    render(<ContactForm defaultName='Jan' defaultEmail='jan@example.com' />);
    field('Twoje imię i nazwisko *', 'Anna');
    field('Adres e-mail *', 'anna@example.com');
    field('Temat wiadomości (opcjonalnie)', 'First subject');
    field('Treść wiadomości *', 'First message content');
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Sugestia funkcji' },
    });
    submit('Wyślij wiadomość');
    const composeAgain = await screen.findByRole('button', {
      name: 'Napisz kolejną wiadomość',
    });

    fireEvent.click(composeAgain);

    expect(mocks.contact).toHaveBeenCalledOnce();
    expect(screen.queryByText('Message stored')).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>(/Twoje imię/).value).toBe(
      'Jan',
    );
    expect(screen.getByLabelText<HTMLInputElement>(/Adres e-mail/).value).toBe(
      'jan@example.com',
    );
    expect(
      screen.getByLabelText<HTMLInputElement>(/Temat wiadomości/).value,
    ).toBe('');
    expect(
      screen.getByLabelText<HTMLTextAreaElement>(/Treść wiadomości/).value,
    ).toBe('');
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe(
      'Pytanie ogólne',
    );

    field('Treść wiadomości *', 'Second message content');
    submit('Wyślij wiadomość');
    await screen.findByRole('heading', { name: 'Wiadomość wysłana!' });
    expect(mocks.contact).toHaveBeenCalledTimes(2);
    const [previousState, data] = mocks.contact.mock.calls[1];
    expect(previousState).toBeNull();
    expect(data.get('name')).toBe('Jan');
    expect(data.get('email')).toBe('jan@example.com');
    expect(data.get('category')).toBe('Pytanie ogólne');
    expect(data.get('subject')).toBe('');
    expect(data.get('message')).toBe('Second message content');
  });
  it('disables duplicate submissions while pending', async () => {
    await pending(
      <ContactForm />,
      'Wyślij wiadomość',
      mocks.contact,
      'Wysyłanie wiadomości…',
    );
  });
});
// @vitest-environment node
import './dom';
import { testing } from './dom';
