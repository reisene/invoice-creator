// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';

const mocks = vi.hoisted(() => ({
  pathname: '/admin',
  push: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
  listUsers: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  revokeUserSessions: vi.fn(),
  setUserPassword: vi.fn(),
  requireAdmin: vi.fn(),
  create: vi.fn(),
  revalidatePath: vi.fn(),
  useImpl: vi.fn(),
  useActionState: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  usePathname: () => mocks.pathname,
}));

vi.mock('@/lib/auth/client', () => ({
  authClient: {
    signOut: mocks.signOut,
    admin: {
      listUsers: mocks.listUsers,
      banUser: mocks.banUser,
      unbanUser: mocks.unbanUser,
      revokeUserSessions: mocks.revokeUserSessions,
      setUserPassword: mocks.setUserPassword,
    },
  },
}));

vi.mock('@/lib/admin/requireAdmin', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    taxParam: {
      create: mocks.create,
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    use: (promise: Promise<unknown>) => {
      promise?.catch?.(() => {});
      return mocks.useImpl(promise);
    },
    useActionState: mocks.useActionState,
  };
});

const { cleanup, fireEvent, render, screen, waitFor } = testing;

const [
  { default: AdminNavigation },
  { default: UserList },
  { default: TaxParamForm },
  { default: SignOutButton },
  { default: CookieSettingsButton },
] = await Promise.all([
  import('@/components/admin/AdminNavigation'),
  import('@/components/admin/UserList'),
  import('@/components/admin/TaxParamForm'),
  import('@/components/SignOutButton'),
  import('@/components/consent/CookieSettingsButton'),
]);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.pathname = '/admin';
  mocks.signOut.mockResolvedValue(undefined);
  mocks.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  mocks.banUser.mockResolvedValue({ error: null });
  mocks.unbanUser.mockResolvedValue({ error: null });
  mocks.revokeUserSessions.mockResolvedValue({ error: null });
  mocks.setUserPassword.mockResolvedValue({ error: null });
  mocks.requireAdmin.mockResolvedValue({
    id: 'admin-1',
    email: 'admin@test.pl',
  });
  mocks.create.mockResolvedValue({});
  // Default: no message state (initial state)
  mocks.useActionState.mockReturnValue([
    { ok: false, message: '' },
    vi.fn(),
    false,
  ]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('AdminNavigation', () => {
  it('renders FAB button with gear icon', () => {
    render(<AdminNavigation />);
    const fab = screen.getByRole('button', { name: 'Panel admina' });
    expect(fab).not.toBeNull();
    expect(fab.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles menu visibility on FAB click', () => {
    render(<AdminNavigation />);
    const fab = screen.getByRole('button', { name: 'Panel admina' });

    expect(fab.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(fab);
    expect(fab.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(fab);
    expect(fab.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows all admin links when menu is open', () => {
    render(<AdminNavigation />);
    const fab = screen.getByRole('button', { name: 'Panel admina' });
    fireEvent.click(fab);

    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Użytkownicy' })).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'Parametry podatkowe' }),
    ).not.toBeNull();
  });

  it('highlights active link based on pathname', () => {
    mocks.pathname = '/admin/users';
    render(<AdminNavigation />);
    const fab = screen.getByRole('button', { name: 'Panel admina' });
    fireEvent.click(fab);

    const usersLink = screen.getByRole('link', { name: 'Użytkownicy' });
    expect(usersLink.className).toContain('btn-primary');

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink.className).toContain('btn-light');
  });

  it('closes menu when clicking outside', () => {
    render(<AdminNavigation />);
    const fab = screen.getByRole('button', { name: 'Panel admina' });
    fireEvent.click(fab);
    expect(fab.getAttribute('aria-expanded')).toBe('true');

    fireEvent.mouseDown(document.body);
    expect(fab.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes menu when clicking a link', () => {
    render(<AdminNavigation />);
    const fab = screen.getByRole('button', { name: 'Panel admina' });
    fireEvent.click(fab);

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(fab.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('UserList', () => {
  const sampleUsers = [
    {
      id: 'u1',
      name: 'Jan Kowalski',
      email: 'jan@test.pl',
      role: 'user',
      banned: false,
      banExpiresAt: null,
      banReason: null,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'u2',
      name: 'Anna Nowak',
      email: 'anna@test.pl',
      role: 'admin',
      banned: true,
      banExpiresAt: null,
      banReason: 'Naruszenie regulaminu',
      createdAt: new Date('2024-02-20'),
      updatedAt: new Date('2024-02-20'),
    },
  ];

  it('shows empty message when no users', () => {
    mocks.useImpl.mockImplementationOnce(() => []);
    render(<UserList />);
    expect(
      screen.queryByText('Brak użytkowników do wyświetlenia'),
    ).not.toBeNull();
  });

  it('renders user table with all columns', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    expect(screen.queryByText('Jan Kowalski')).not.toBeNull();
    expect(screen.queryByText('jan@test.pl')).not.toBeNull();
    expect(screen.queryByText('user')).not.toBeNull();
    expect(screen.queryByText('Aktywny')).not.toBeNull();
  });

  it('shows banned badge for banned users', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    expect(screen.queryByText('Zbanowany')).not.toBeNull();
  });

  it('shows ban button for active users', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    expect(screen.queryByRole('button', { name: 'Zbanuj' })).not.toBeNull();
  });

  it('shows unban button for banned users', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    expect(screen.queryByRole('button', { name: 'Odblokuj' })).not.toBeNull();
  });

  it('shows reset password and revoke sessions buttons for active users', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    expect(
      screen.queryByRole('button', { name: 'Resetuj hasło' }),
    ).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Wyloguj wszędzie' }),
    ).not.toBeNull();
  });

  it('opens ban modal when ban button is clicked', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Zbanuj' }));
    expect(screen.queryByText('Zbanuj użytkownika')).not.toBeNull();
    expect(screen.queryByLabelText('Powód zablokowania')).not.toBeNull();
  });

  it('opens password reset modal when reset password button is clicked', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Resetuj hasło' }));
    const modalTitle = screen.queryAllByText('Resetuj hasło');
    expect(modalTitle.length).toBeGreaterThan(1);
    expect(screen.queryByLabelText('Nowe hasło')).not.toBeNull();
  });

  it('calls unbanUser when unban button is clicked', async () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    mocks.listUsers.mockResolvedValue({
      data: { users: sampleUsers.map((u) => ({ ...u, banned: false })) },
      error: null,
    });
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Odblokuj' }));
    await waitFor(() =>
      expect(mocks.unbanUser).toHaveBeenCalledWith({ userId: 'u2' }),
    );
  });

  it('calls revokeUserSessions when revoke button is clicked', async () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    mocks.listUsers.mockResolvedValue({
      data: { users: sampleUsers },
      error: null,
    });
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Wyloguj wszędzie' }));
    await waitFor(() =>
      expect(mocks.revokeUserSessions).toHaveBeenCalledWith({ userId: 'u1' }),
    );
  });

  it('shows error alert when unban fails', async () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    mocks.unbanUser.mockResolvedValue({
      error: { message: 'Unauthorized' },
    });
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Odblokuj' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Nie udało się odblokować użytkownika.'),
      ).not.toBeNull(),
    );
  });

  it('shows error alert when revoke sessions fails', async () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    mocks.revokeUserSessions.mockResolvedValue({
      error: { message: 'Unauthorized' },
    });
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Wyloguj wszędzie' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Nie udało się wylogować użytkownika.'),
      ).not.toBeNull(),
    );
  });

  it('opens ban modal and shows confirm button disabled without reason', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Zbanuj' }));
    const confirmBtn = screen.queryAllByText('Zbanuj i wyślij powiadomienie');
    expect(confirmBtn.length).toBeGreaterThan(0);
    const btnElement = confirmBtn[confirmBtn.length - 1].closest('button');
    expect(btnElement?.getAttribute('disabled')).not.toBeNull();
  });

  it('shows cancel button in ban modal', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Zbanuj' }));
    expect(screen.queryByText('Zbanuj użytkownika')).not.toBeNull();

    // Both modals render "Anuluj" buttons; at least one should be present
    const cancelButtons = screen.queryAllByText('Anuluj');
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('shows password reset modal with disabled button for short password', () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);

    fireEvent.click(screen.getByRole('button', { name: 'Resetuj hasło' }));
    const resetButtons = screen.queryAllByText('Zresetuj hasło');
    // The last one should be the button in the modal footer
    const btnElement = resetButtons[resetButtons.length - 1].closest('button');
    expect(btnElement?.getAttribute('disabled')).not.toBeNull();
  });

  it('renders user with null name as dash', () => {
    const usersWithNullName = [
      {
        id: 'u3',
        name: null,
        email: 'anon@test.pl',
        role: null,
        banned: false,
        banExpiresAt: null,
        banReason: null,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      },
    ];
    mocks.useImpl.mockImplementationOnce(() => usersWithNullName);
    render(<UserList />);

    expect(screen.queryByText('anon@test.pl')).not.toBeNull();
  });

  const openBanModal = () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);
    fireEvent.click(screen.getByRole('button', { name: 'Zbanuj' }));
    fireEvent.change(screen.getByLabelText('Powód zablokowania'), {
      target: { value: 'Spam' },
    });
    const buttons = screen.getAllByText('Zbanuj i wyślij powiadomienie');
    return buttons[buttons.length - 1].closest('button') as HTMLButtonElement;
  };

  const openResetModal = () => {
    mocks.useImpl.mockImplementationOnce(() => sampleUsers);
    render(<UserList />);
    fireEvent.click(screen.getByRole('button', { name: 'Resetuj hasło' }));
    fireEvent.change(screen.getByLabelText('Nowe hasło'), {
      target: { value: 'longenoughpass' },
    });
    const buttons = screen.getAllByText('Zresetuj hasło');
    return buttons[buttons.length - 1].closest('button') as HTMLButtonElement;
  };

  it('bans a user, sends notification and refreshes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal('fetch', fetchMock);
    const confirm = openBanModal();
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.banUser).toHaveBeenCalled());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(mocks.listUsers).toHaveBeenCalled());
    vi.unstubAllGlobals();
  });

  it('ignores notification fetch failure after ban', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')));
    fireEvent.click(openBanModal());
    await waitFor(() => expect(mocks.listUsers).toHaveBeenCalled());
    vi.unstubAllGlobals();
  });

  it('shows error when ban returns an error', async () => {
    mocks.banUser.mockResolvedValue({ error: { message: 'no' } });
    fireEvent.click(openBanModal());
    await waitFor(() =>
      expect(
        screen.queryByText('Nie udało się zbanować użytkownika.'),
      ).not.toBeNull(),
    );
  });

  it('shows error when ban throws', async () => {
    mocks.banUser.mockRejectedValue(new Error('boom'));
    fireEvent.click(openBanModal());
    await waitFor(() =>
      expect(
        screen.queryByText('Wystąpił błąd podczas banowania użytkownika.'),
      ).not.toBeNull(),
    );
  });

  it('resets a password and refreshes', async () => {
    fireEvent.click(openResetModal());
    await waitFor(() =>
      expect(mocks.setUserPassword).toHaveBeenCalledWith({
        userId: 'u1',
        newPassword: 'longenoughpass',
      }),
    );
    await waitFor(() => expect(mocks.listUsers).toHaveBeenCalled());
  });

  it('shows error when password reset returns an error', async () => {
    mocks.setUserPassword.mockResolvedValue({ error: { message: 'no' } });
    fireEvent.click(openResetModal());
    await waitFor(() =>
      expect(
        screen.queryByText('Nie udało się zresetować hasła.'),
      ).not.toBeNull(),
    );
  });

  it('shows error when password reset throws', async () => {
    mocks.setUserPassword.mockRejectedValue(new Error('boom'));
    fireEvent.click(openResetModal());
    await waitFor(() =>
      expect(
        screen.queryByText('Wystąpił błąd podczas resetowania hasła.'),
      ).not.toBeNull(),
    );
  });

  it('shows error when refreshing the list fails', async () => {
    mocks.useImpl.mockImplementation(() => sampleUsers);
    render(<UserList />);
    await waitFor(() => expect(mocks.listUsers).toHaveBeenCalled());
    mocks.listUsers.mockResolvedValue({
      data: null,
      error: { message: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyloguj wszędzie' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Nie udało się pobrać listy użytkowników.'),
      ).not.toBeNull(),
    );
  });

  it('shows error when refreshing the list throws', async () => {
    mocks.useImpl.mockImplementation(() => sampleUsers);
    render(<UserList />);
    await waitFor(() => expect(mocks.listUsers).toHaveBeenCalled());
    mocks.listUsers.mockRejectedValue(new Error('boom'));
    fireEvent.click(screen.getByRole('button', { name: 'Wyloguj wszędzie' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Wystąpił błąd podczas pobierania użytkowników.'),
      ).not.toBeNull(),
    );
  });
});

describe('TaxParamForm', () => {
  it('renders form with all required fields', () => {
    render(<TaxParamForm />);

    expect(screen.queryByLabelText('Rok')).not.toBeNull();
    expect(screen.queryByLabelText('Stawka emerytalna')).not.toBeNull();
    expect(screen.queryByLabelText('Składka rentowa')).not.toBeNull();
    expect(screen.queryByLabelText('Składka chorobowa')).not.toBeNull();
    expect(screen.queryByLabelText('Składka zdrowotna')).not.toBeNull();
  });

  it('shows submit button', () => {
    render(<TaxParamForm />);
    expect(
      screen.queryByRole('button', { name: 'Dodaj parametry' }),
    ).not.toBeNull();
  });

  it('shows success alert when state has ok message', () => {
    mocks.useActionState.mockReturnValue([
      { ok: true, message: 'Parametry dodane!' },
      vi.fn(),
      false,
    ]);
    render(<TaxParamForm />);
    const alert = screen.queryByText('Parametry dodane!');
    expect(alert).not.toBeNull();
    // Success alert should have bg-success or similar
    const alertElement = alert?.closest('div[role="alert"]');
    expect(alertElement?.className).toContain('alert-success');
  });

  it('shows danger alert when state has error message', () => {
    mocks.useActionState.mockReturnValue([
      { ok: false, message: 'Błąd: rok już istnieje' },
      vi.fn(),
      false,
    ]);
    render(<TaxParamForm />);
    const alert = screen.queryByText('Błąd: rok już istnieje');
    expect(alert).not.toBeNull();
    const alertElement = alert?.closest('div[role="alert"]');
    expect(alertElement?.className).toContain('alert-danger');
  });

  it('shows pending button text when form is submitting', () => {
    mocks.useActionState.mockReturnValue([
      { ok: false, message: '' },
      vi.fn(),
      true,
    ]);
    render(<TaxParamForm />);
    // Button text is "Zapisywanie…" with disabled state
    const button = screen.getByRole('button', { name: 'Zapisywanie…' });
    expect(button).not.toBeNull();
    expect(button.getAttribute('disabled')).not.toBeNull();
  });
});

describe('SignOutButton', () => {
  it('renders sign out button with icon', () => {
    render(<SignOutButton />);
    const button = screen.getByRole('button', { name: 'Wyloguj' });
    expect(button).not.toBeNull();
  });

  it('calls signOut and navigates on click', async () => {
    render(<SignOutButton />);
    const button = screen.getByRole('button', { name: 'Wyloguj' });

    fireEvent.click(button);

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledWith('/');
    expect(mocks.refresh).toHaveBeenCalled();
  });
});

describe('CookieSettingsButton', () => {
  it('renders link to cookie settings page', () => {
    render(<CookieSettingsButton />);
    const link = screen.getByRole('link', { name: 'Ustawienia cookies' });
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/cookies');
  });
});
