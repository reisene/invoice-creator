// @vitest-environment node
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  social: vi.fn(),
  signOut: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  pathname: '/',
}));
vi.mock('@/lib/auth/client', () => ({
  authClient: {
    useSession: mocks.session,
    signIn: { social: mocks.social },
    signOut: mocks.signOut,
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  usePathname: () => mocks.pathname,
}));
vi.mock('next/font/google', () => ({
  Fira_Mono: () => ({ className: 'test-mono' }),
}));

const { act, cleanup, fireEvent, render, screen, waitFor } = testing;
const [
  { default: AuthButtons },
  { default: GoogleSignInButton },
  { default: AppNavbar },
  { default: Footer },
  { default: HeroSimulator },
  { default: Hero },
  { default: CtaBanner },
  { default: Features },
  { default: HowItWorks },
  { default: InvoiceContent },
  { default: HelpArticlesSection },
] = await Promise.all([
  import('@/components/AuthButtons'),
  import('@/components/auth/GoogleSignInButton'),
  import('@/components/AppNavbar'),
  import('@/components/Footer'),
  import('@/components/Home/HeroSimulator'),
  import('@/components/Home/Hero'),
  import('@/components/Home/CtaBanner'),
  import('@/components/Home/Features'),
  import('@/components/Home/HowItWorks'),
  import('@/components/Home/InvoiceContent'),
  import('@/components/Home/HelpArticlesSection'),
]);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.pathname = '/';
  sessionStorage.clear();
  mocks.session.mockReturnValue({ data: null, isPending: false });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('authentication controls', () => {
  it('shows placeholders while loading and guest links only after loading', () => {
    mocks.session.mockReturnValue({ data: null, isPending: true });
    const { container, rerender } = render(<AuthButtons />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    mocks.session.mockReturnValue({ data: null, isPending: false });
    rerender(<AuthButtons />);
    expect(
      screen.getByRole('button', { name: 'Rejestracja' }).getAttribute('href'),
    ).toBe('/auth/sign-up');
    expect(
      screen.getByRole('button', { name: 'Logowanie' }).getAttribute('href'),
    ).toBe('/auth/sign-in');
  });
  it('shows account and signs out before navigating and refreshing', async () => {
    let complete!: () => void;
    mocks.signOut.mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    mocks.session.mockReturnValue({
      data: { user: { id: 'u1' } },
      isPending: false,
    });
    render(<AuthButtons />);
    expect(
      screen.getByRole('button', { name: 'Konto' }).getAttribute('href'),
    ).toBe('/account');
    fireEvent.click(screen.getByRole('button', { name: 'Wyloguj' }));
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => {
      complete();
    });
    expect(mocks.push).toHaveBeenCalledWith('/');
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it('keeps Google sign-in pending on successful redirect initiation', async () => {
    mocks.social.mockResolvedValue({ error: null });
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(mocks.social).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/auth/terms-check',
      }),
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Łączenie z Google...',
      }).disabled,
    ).toBe(true);
  });
  it('localizes Google errors and supports retry after a thrown network failure', async () => {
    mocks.social
      .mockResolvedValueOnce({ error: { code: 'INVALID_EMAIL' } })
      .mockRejectedValueOnce(new Error('network'));
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole('button'));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Nieprawidłowy adres e-mail.',
    );
    await waitFor(() =>
      expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(
        false,
      ),
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'Nie udało się zalogować przez Google. Spróbuj ponownie.',
      ),
    );
    expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(false);
  });
});

describe('navigation and footer', () => {
  it.each(['/', '/generator', '/help/article', '/helpful'])(
    'marks only matching routes active for %s',
    (pathname) => {
      vi.useFakeTimers();
      mocks.pathname = pathname;
      render(<AppNavbar authButtons={<span>Auth slot</span>} />);
      const expected =
        pathname === '/'
          ? 'Start'
          : pathname === '/generator'
            ? 'Generator'
            : pathname === '/help/article'
              ? 'Pomoc'
              : null;
      for (const name of ['Start', 'Generator', 'Wzory', 'Pomoc', 'Kontakt']) {
        expect(
          screen.getByRole('link', { name }).getAttribute('aria-current'),
        ).toBe(name === expected ? 'page' : null);
      }
      const toggle = screen.getByRole('button', { name: 'Przełącz nawigację' });
      fireEvent.click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      fireEvent.click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      act(() => {
        vi.runAllTimers();
      });
      expect(screen.getByText('Auth slot')).toBeDefined();
    },
  );
  it.each([2026, 2028])(
    'renders the copyright year %s and safe footer links',
    (year) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${year}-06-01T12:00:00Z`));
      render(
        <Footer
          author={{
            name: 'Author',
            url: 'https://author.example.com',
            ico: () => <svg />,
          }}
        />,
      );
      expect(screen.getByText(/Copyright/).textContent).toContain(
        year === 2026 ? '2026' : '2026 - 2028',
      );
      expect(
        screen.getByRole('link', { name: 'Regulamin' }).getAttribute('href'),
      ).toBe('/terms');
      expect(
        screen
          .getByRole('link', { name: 'Polityka prywatności' })
          .getAttribute('href'),
      ).toBe('/privacy');
      expect(
        screen
          .getByRole('link', { name: 'Ustawienia cookies' })
          .getAttribute('href'),
      ).toBe('/cookies');
      expect(
        screen.getByRole('link', { name: 'Repozytorium' }).getAttribute('rel'),
      ).toBe('noopener noreferrer');
      expect(
        screen.getByRole('link', { name: 'Author' }).getAttribute('rel'),
      ).toBe('noopener noreferrer');
    },
  );
});

describe('home content and simulator', () => {
  it('renders all home sections and links to the generator and knowledge base', () => {
    render(
      <>
        <Hero />
        <CtaBanner />
        <Features />
        <HowItWorks />
        <InvoiceContent />
        <HelpArticlesSection />
      </>,
    );
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(15);
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.getAttribute('href') === '/generator'),
    ).toBe(true);
    expect(
      screen
        .getByRole('link', { name: 'Zobacz wszystkie artykuły w Bazie wiedzy' })
        .getAttribute('href'),
    ).toBe('/help');
    expect(
      screen.getAllByRole('link', { name: 'Przeczytaj poradnik' }),
    ).toHaveLength(4);
    expect(
      screen.getByText('Co musi zawierać poprawny rachunek?'),
    ).toBeDefined();
  });
  it('updates gross presets, manual amounts, and all contractor statuses before opening the generator', () => {
    render(<HeroSimulator />);
    const input = screen.getByRole<HTMLInputElement>('spinbutton');
    for (const amount of [3000, 4500, 6000, 8000]) {
      fireEvent.click(
        screen.getByRole('button', {
          name: `${amount.toLocaleString('pl-PL')} zł`,
        }),
      );
      expect(input.value).toBe(String(amount));
    }
    fireEvent.change(input, { target: { value: '-5' } });
    expect(input.value).toBe('0');
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('0');
    fireEvent.change(input, { target: { value: '5000.50' } });
    for (const [label, status] of [
      ['Student < 26 lat', 'student_under_26'],
      ['Etat (zbieg)', 'with_employment'],
      ['Standard', 'standard'],
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      fireEvent.click(
        screen.getByRole('button', { name: 'Wystaw rachunek z tą kwotą' }),
      );
      const preset: InvoiceFormData = JSON.parse(
        sessionStorage.getItem('generator_preset_data')!,
      );
      expect(preset).toMatchObject({
        grossAmount: 5000.5,
        contractorStatus: status,
        youngRelief: status === 'student_under_26',
        taxReduction: status !== 'student_under_26',
      });
      expect(preset.periodStart.slice(-2)).toBe('01');
      const { calculations } = calculateInvoice(preset, DEFAULT_TAX_PARAMS);
      const formattedNet = calculations.net.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      expect(
        screen.getByText(`${formattedNet} zł`, { exact: true }),
      ).toBeDefined();
    }
    expect(mocks.push).toHaveBeenCalledWith('/generator');
  });
  it('continues navigation when session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<HeroSimulator />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Wystaw rachunek z tą kwotą' }),
    );
    expect(mocks.push).toHaveBeenCalledWith('/generator');
  });
});
