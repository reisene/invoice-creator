// @vitest-environment node
import {
  BankAccountForm,
  DeleteAccountForm,
  EmailChangeForm,
  PasswordForm,
  ProfileForm,
} from '@/app/account/AccountForms';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './dom';
import { testing } from './dom';

const { act, cleanup, fireEvent, render, screen, waitFor } = testing;
const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  password: vi.fn(),
  bank: vi.fn(),
  deleteBank: vi.fn(),
  deletion: vi.fn(),
  code: vi.fn(),
  email: vi.fn(),
  confirm: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('@/app/account/actions', () => ({
  updateProfile: mocks.profile,
  changePassword: mocks.password,
  saveBankAccount: mocks.bank,
  deleteBankAccount: mocks.deleteBank,
  deleteAccount: mocks.deletion,
  requestAccountDeletionCode: mocks.code,
  requestEmailChange: mocks.email,
  confirmEmailChange: mocks.confirm,
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function submit(name: string) {
  const form = screen.getByRole('button', { name }).closest('form');
  if (!form) throw new Error('Submit button has no form');
  fireEvent.submit(form);
}
function field(name: string, value: string) {
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
}

describe('profile, password and bank forms', () => {
  it.each([false, true])(
    'renders profile and verification status %s',
    (emailVerified) => {
      render(
        <ProfileForm
          name='Jan'
          email='jan@example.com'
          emailVerified={emailVerified}
        />,
      );
      expect(
        screen.getByLabelText<HTMLInputElement>('Imię i nazwisko').value,
      ).toBe('Jan');
      expect(
        screen.getByLabelText<HTMLInputElement>('Adres e-mail').disabled,
      ).toBe(true);
      expect(
        screen.queryByRole('link', { name: 'Zweryfikuj adres e-mail.' }) !==
          null,
      ).toBe(!emailVerified);
    },
  );

  it.each([
    [
      'profile',
      <ProfileForm
        key='profile'
        name='Jan'
        email='jan@example.com'
        emailVerified
      />,
      'Zapisz zmiany',
      mocks.profile,
    ],
    [
      'password',
      <PasswordForm key='password' hasPassword />,
      'Zmień hasło',
      mocks.password,
    ],
    [
      'bank',
      <BankAccountForm key='bank' bankAccount={null} />,
      'Zapisz rachunek bankowy',
      mocks.bank,
    ],
  ] as const)(
    'displays both server outcomes and pending state for %s',
    async (_label, element, label, action) => {
      action
        .mockResolvedValueOnce({ ok: false, message: 'Save failed' })
        .mockResolvedValueOnce({ ok: true, message: 'Saved' });
      render(element);
      submit(label);
      expect(
        (await screen.findByRole('alert')).classList.contains('alert-danger'),
      ).toBe(true);
      expect(screen.getByText('Save failed')).toBeDefined();
      submit(label);
      await waitFor(() =>
        expect(
          screen.getByRole('alert').classList.contains('alert-success'),
        ).toBe(true),
      );
      expect(screen.getByText('Saved')).toBeDefined();
      let resolve!: (value: null) => void;
      action.mockReturnValue(
        new Promise<null>((done) => {
          resolve = done;
        }),
      );
      submit(label);
      await waitFor(() =>
        expect(
          screen.getByRole<HTMLButtonElement>('button', {
            name: 'Zapisywanie…',
          }).disabled,
        ).toBe(true),
      );
      await act(async () => {
        resolve(null);
      });
    },
  );

  it.each([false, null])(
    'does not show a password form if password availability is %s',
    (hasPassword) => {
      render(<PasswordForm hasPassword={hasPassword} />);
      expect(screen.queryByLabelText('Obecne hasło')).toBeNull();
      expect(
        screen.getByText(
          hasPassword === null
            ? /Nie udało się sprawdzić metody/
            : /Konto nie ma ustawionego hasła/,
        ),
      ).toBeDefined();
    },
  );

  it('prefills bank data and cancels deletion without side effects', () => {
    const bankAccount = {
      accountHolder: 'Jan',
      bankName: 'Bank',
      accountNumber: '123',
    };
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<BankAccountForm bankAccount={bankAccount} />);
    expect(
      screen.getByLabelText<HTMLInputElement>('Właściciel rachunku').value,
    ).toBe('Jan');
    expect(
      screen.getByLabelText<HTMLInputElement>('Nazwa banku / instytucji').value,
    ).toBe('Bank');
    fireEvent.click(
      screen.getByRole('button', { name: 'Usuń zapisany rachunek' }),
    );
    expect(mocks.deleteBank).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'shows bank deletion outcome ok=%s, refreshing only after success',
    async (ok) => {
      mocks.deleteBank.mockResolvedValue({ ok, message: 'Deletion result' });
      render(
        <BankAccountForm
          bankAccount={{
            accountHolder: 'Jan',
            bankName: 'Bank',
            accountNumber: '123',
          }}
        />,
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Usuń zapisany rachunek' }),
      );
      expect(await screen.findByText('Deletion result')).toBeDefined();
      expect(mocks.refresh).toHaveBeenCalledTimes(ok ? 1 : 0);
    },
  );

  it('disables bank deletion while pending', async () => {
    let resolve!: (value: { ok: boolean; message: string }) => void;
    mocks.deleteBank.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(
      <BankAccountForm
        bankAccount={{
          accountHolder: 'Jan',
          bankName: 'Bank',
          accountNumber: '123',
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Usuń zapisany rachunek' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Usuwanie…' })
          .disabled,
      ).toBe(true),
    );
    await act(async () => {
      resolve({ ok: false, message: 'Failed' });
    });
  });
});

describe('account deletion form', () => {
  it('defaults to password confirmation and submits explicit acknowledgement', async () => {
    mocks.deletion.mockResolvedValue({ ok: false, message: 'Cannot delete' });
    render(<DeleteAccountForm />);
    field('Hasło', 'password');
    fireEvent.click(screen.getByRole('checkbox'));
    submit('Usuń konto i dane');
    expect(await screen.findByText('Cannot delete')).toBeDefined();
    const data: FormData = mocks.deletion.mock.calls[0][1];
    expect(data.get('method')).toBe('password');
    expect(data.get('password')).toBe('password');
    expect(data.get('confirm')).toBe('on');
  });

  it.each([false, true])(
    'switches to email OTP and reports send-code outcome ok=%s',
    async (ok) => {
      mocks.code.mockResolvedValue({ ok, message: 'Code result' });
      mocks.deletion.mockResolvedValue({ ok: false, message: 'Delete result' });
      render(<DeleteAccountForm />);
      field('Potwierdzenie tożsamości', 'email-code');
      expect(screen.queryByLabelText('Hasło')).toBeNull();
      submit('Wyślij kod e-mail');
      expect(await screen.findByText('Code result')).toBeDefined();
      field('Kod z wiadomości e-mail', '123456');
      submit('Usuń konto i dane');
      expect(await screen.findByText('Delete result')).toBeDefined();
      const data: FormData = mocks.deletion.mock.calls[0][1];
      expect(data.get('method')).toBe('email-code');
      expect(data.get('otp')).toBe('123456');
      expect(data.get('password')).toBeNull();
    },
  );

  it.each(['code', 'delete'])(
    'locks identity mode during pending %s operation',
    async (kind) => {
      let resolve!: (value: null) => void;
      const action = kind === 'code' ? mocks.code : mocks.deletion;
      action.mockReturnValue(
        new Promise<null>((done) => {
          resolve = done;
        }),
      );
      render(<DeleteAccountForm />);
      field('Potwierdzenie tożsamości', 'email-code');
      submit(kind === 'code' ? 'Wyślij kod e-mail' : 'Usuń konto i dane');
      await waitFor(() =>
        expect(
          screen.getByLabelText<HTMLSelectElement>('Potwierdzenie tożsamości')
            .disabled,
        ).toBe(true),
      );
      expect(
        screen.getByRole<HTMLButtonElement>('button', {
          name: kind === 'code' ? 'Wysyłanie…' : 'Usuwanie…',
        }).disabled,
      ).toBe(true);
      await act(async () => {
        resolve(null);
      });
    },
  );
});

describe('email change form', () => {
  it('reports request errors without showing the confirmation form', async () => {
    mocks.email.mockResolvedValue({ ok: false, message: 'Request failed' });
    render(<EmailChangeForm />);
    field('Nowy adres e-mail', 'new@example.com');
    submit('Wyślij kod');
    expect(await screen.findByText('Request failed')).toBeDefined();
    expect(screen.queryByLabelText('Kod z wiadomości')).toBeNull();
  });
  it('binds OTP confirmation to the requested address and invalidates the UI when it changes', async () => {
    mocks.email.mockResolvedValue({
      ok: true,
      message: 'Code sent',
      newEmail: 'new@example.com',
    });
    mocks.confirm
      .mockResolvedValueOnce({ ok: false, message: 'Invalid code' })
      .mockResolvedValueOnce({ ok: true, message: 'Email changed' });
    render(<EmailChangeForm />);
    field('Nowy adres e-mail', ' NEW@EXAMPLE.COM ');
    submit('Wyślij kod');
    expect(await screen.findByLabelText('Kod z wiadomości')).toBeDefined();
    field('Kod z wiadomości', '123456');
    submit('Potwierdź zmianę');
    expect(await screen.findByText('Invalid code')).toBeDefined();
    const data: FormData = mocks.confirm.mock.calls[0][1];
    expect(data.get('newEmail')).toBe('new@example.com');
    expect(data.get('otp')).toBe('123456');
    field('Nowy adres e-mail', 'other@example.com');
    expect(screen.queryByLabelText('Kod z wiadomości')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Wyślij nowy kod');
    field('Nowy adres e-mail', 'new@example.com');
    submit('Potwierdź zmianę');
    expect(await screen.findByText('Email changed')).toBeDefined();
    expect(screen.queryByLabelText('Nowy adres e-mail')).toBeNull();
  });
  it('locks the email input while requesting a code', async () => {
    let resolve!: (value: null) => void;
    mocks.email.mockReturnValue(
      new Promise<null>((done) => {
        resolve = done;
      }),
    );
    render(<EmailChangeForm />);
    field('Nowy adres e-mail', 'new@example.com');
    submit('Wyślij kod');
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Wysyłanie…' })
          .disabled,
      ).toBe(true),
    );
    expect(
      screen.getByLabelText<HTMLInputElement>('Nowy adres e-mail').disabled,
    ).toBe(true);
    await act(async () => {
      resolve(null);
    });
  });
  it('locks both forms while confirming a code', async () => {
    mocks.email.mockResolvedValue({
      ok: true,
      message: 'Sent',
      newEmail: 'new@example.com',
    });
    let resolve!: (value: null) => void;
    mocks.confirm.mockReturnValue(
      new Promise<null>((done) => {
        resolve = done;
      }),
    );
    render(<EmailChangeForm />);
    field('Nowy adres e-mail', 'new@example.com');
    submit('Wyślij kod');
    await screen.findByLabelText('Kod z wiadomości');
    submit('Potwierdź zmianę');
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Sprawdzanie…' })
          .disabled,
      ).toBe(true),
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Wyślij kod' })
        .disabled,
    ).toBe(true);
    await act(async () => {
      resolve(null);
    });
  });
});
