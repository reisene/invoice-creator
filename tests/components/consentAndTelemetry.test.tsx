// @vitest-environment node
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_SETTINGS_EVENT,
  type CookieConsentChoice,
} from '@/lib/cookieConsent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  clear: vi.fn(),
  capture: vi.fn(),
  add: vi.fn(),
  replay: vi.fn(),
  stop: vi.fn(),
  analytics: vi.fn(),
  speed: vi.fn(),
}));
vi.mock('@/app/cookie-consent/actions', () => ({
  saveCookieConsent: mocks.save,
  clearCookieConsent: mocks.clear,
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.capture,
  addIntegration: mocks.add,
  replayIntegration: mocks.replay,
}));
vi.mock('@vercel/analytics/next', () => ({ Analytics: mocks.analytics }));
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: mocks.speed }));
const { act, cleanup, fireEvent, render, screen, waitFor } = testing;
const [
  { default: CookieConsentBanner },
  { default: ClearCookieConsentButton },
  { default: VercelTelemetry },
  { default: Replay },
] = await Promise.all([
  import('@/components/consent/CookieConsentBanner'),
  import('@/components/consent/ClearCookieConsentButton'),
  import('@/components/telemetry/VercelTelemetry'),
  import('@/components/telemetry/ConsentedSentryReplayClient'),
]);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.analytics.mockReturnValue(null);
  mocks.speed.mockReturnValue(null);
  mocks.replay.mockReturnValue({ stop: mocks.stop });
  mocks.stop.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('cookie consent', () => {
  it.each([
    [null, false, false],
    ['REJECT_OPTIONAL', false, false],
    ['ACCEPT_ANALYTICS', true, false],
    ['ACCEPT_REPLAY', false, true],
    ['ACCEPT_OPTIONAL', true, true],
  ] satisfies [CookieConsentChoice | null, boolean, boolean][])(
    'prefills independent purposes for %s without collecting consent automatically',
    (choice, analytics, replay) => {
      render(<CookieConsentBanner initialChoice={choice} />);
      act(() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT)));
      expect(
        screen.getByRole<HTMLInputElement>('switch', {
          name: 'Analityka i wydajność',
        }).checked,
      ).toBe(analytics);
      expect(
        screen.getByRole<HTMLInputElement>('switch', {
          name: 'Odtwarzanie sesji',
        }).checked,
      ).toBe(replay);
      expect(mocks.save).not.toHaveBeenCalled();
    },
  );
  it.each([
    [false, false, 'REJECT_OPTIONAL'],
    [true, false, 'ACCEPT_ANALYTICS'],
    [false, true, 'ACCEPT_REPLAY'],
    [true, true, 'ACCEPT_OPTIONAL'],
  ])(
    'saves selected analytics %s and replay %s, not merely opened settings',
    async (analytics, replay, choice) => {
      mocks.save.mockResolvedValue({ ok: true });
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const changed = vi.fn();
      window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, changed);
      render(<CookieConsentBanner initialChoice={null} />);
      fireEvent.click(
        screen.getByRole('button', { name: 'Ustawienia i szczegóły' }),
      );
      if (analytics)
        fireEvent.click(
          screen.getByRole('switch', { name: 'Analityka i wydajność' }),
        );
      if (replay)
        fireEvent.click(
          screen.getByRole('switch', { name: 'Odtwarzanie sesji' }),
        );
      expect(mocks.save).not.toHaveBeenCalled();
      fireEvent.click(
        screen.getByRole('button', { name: 'Zapisz wybrane ustawienia' }),
      );
      await waitFor(() => expect(changed).toHaveBeenCalledOnce());
      expect(mocks.save).toHaveBeenCalledWith(choice);
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, changed);
    },
  );
  it('allows withdrawing one purpose while keeping the other and reports a failed save', async () => {
    let resolve!: (result: { ok: false; message: string }) => void;
    mocks.save.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<CookieConsentBanner initialChoice='ACCEPT_OPTIONAL' />);
    act(() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT)));
    fireEvent.click(screen.getByRole('switch', { name: 'Odtwarzanie sesji' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Zapisz wybrane ustawienia' }),
    );
    expect(mocks.save).toHaveBeenCalledWith('ACCEPT_ANALYTICS');
    expect(
      screen.getByRole<HTMLInputElement>('switch', {
        name: 'Analityka i wydajność',
      }).disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>('switch', {
        name: 'Odtwarzanie sesji',
      }).disabled,
    ).toBe(true);
    await act(async () =>
      resolve({ ok: false, message: 'Błąd zapisu ustawień' }),
    );
    expect(screen.getByRole('alert').textContent).toBe('Błąd zapisu ustawień');
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', {
          name: 'Zapisz wybrane ustawienia',
        }).disabled,
      ).toBe(false),
    );
    expect(
      screen.getByRole<HTMLInputElement>('switch', {
        name: 'Analityka i wydajność',
      }).checked,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>('switch', {
        name: 'Odtwarzanie sesji',
      }).checked,
    ).toBe(false);
  });
  it('shows the initial banner, toggles details and links the policy', () => {
    render(<CookieConsentBanner initialChoice={null} />);
    expect(
      screen.getByRole('region', { name: 'Ty decydujesz o cookies' }),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: 'Ustawienia i szczegóły' }),
    );
    expect(
      screen
        .getByRole('button', { name: 'Ukryj szczegóły' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.getAttribute('href') === '/privacy#cookies'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ukryj szczegóły' }));
    expect(
      screen
        .getByRole('button', { name: 'Ustawienia i szczegóły' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });
  it('reopens a remembered choice with the floating button or settings event', () => {
    const { unmount } = render(
      <CookieConsentBanner initialChoice='REJECT_OPTIONAL' />,
    );
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Otwórz ustawienia cookies' }),
    );
    expect(
      screen.getByRole('button', { name: 'Ukryj szczegóły' }),
    ).toBeDefined();
    unmount();
    render(<CookieConsentBanner initialChoice='ACCEPT_OPTIONAL' />);
    act(() => {
      window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
    });
    expect(
      screen.getByRole('button', { name: 'Ukryj szczegóły' }),
    ).toBeDefined();
  });
  it.each([
    ['Tylko niezbędne', 'REJECT_OPTIONAL'],
    ['Akceptuj wszystkie', 'ACCEPT_OPTIONAL'],
  ])(
    'persists %s and notifies collectors only on success',
    async (label, choice) => {
      let resolve!: (result: { ok: boolean; message?: string }) => void;
      mocks.save
        .mockReturnValueOnce(
          new Promise((done) => {
            resolve = done;
          }),
        )
        .mockResolvedValueOnce({ ok: true });
      const changed = vi.fn();
      window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, changed);
      const reloadError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      render(<CookieConsentBanner initialChoice={null} />);
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(mocks.save).toHaveBeenCalledWith(choice);
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: label }).disabled,
      ).toBe(true);
      await act(async () => {
        resolve({ ok: false, message: 'Nie zapisano' });
      });
      expect(screen.getByRole('alert').textContent).toBe('Nie zapisano');
      expect(changed).not.toHaveBeenCalled();
      act(() => {
        window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
      });
      expect(screen.queryByRole('alert')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: label }));
      await waitFor(() => expect(changed).toHaveBeenCalledOnce());
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, changed);
      reloadError.mockRestore();
    },
  );
  it('clears a choice, handles pending/errors, and dispatches change on retry', async () => {
    let resolve!: (result: { ok: boolean; message?: string }) => void;
    mocks.clear
      .mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValueOnce({ ok: true });
    const changed = vi.fn();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, changed);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ClearCookieConsentButton hasChoice={false} />);
    expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(true);
    rerender(<ClearCookieConsentButton hasChoice />);
    fireEvent.click(screen.getByRole('button'));
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Usuwanie wyboru…',
      }).disabled,
    ).toBe(true);
    await act(async () => {
      resolve({ ok: false, message: 'Nie usunięto' });
    });
    expect(screen.getByRole('alert').textContent).toBe('Nie usunięto');
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).toBeNull();
    window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, changed);
  });
});

describe('consented telemetry lifecycle', () => {
  it('redacts search/hash, rejects private routes and stops both collectors after withdrawal', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<VercelTelemetry />);
    type Collector = {
      debug: boolean;
      beforeSend: <T extends { url: string }>(event: T) => T | null;
    };
    const analytics: Collector = mocks.analytics.mock.calls[0][0];
    const speed: Collector = mocks.speed.mock.calls[0][0];
    expect(analytics.debug).toBe(false);
    expect(speed.debug).toBe(false);
    for (const collector of [analytics, speed]) {
      if (!collector.beforeSend) throw new Error('Missing beforeSend');
      const send = collector.beforeSend;
      for (const path of [
        '/auth',
        '/auth/sign-in',
        '/account',
        '/account/history',
        '/api/invoices',
        '/terms/accept',
      ]) {
        expect(
          send({
            type: 'pageview',
            url: `https://example.com${path}?email=private#token`,
          }),
        ).toBeNull();
      }
      expect(
        send({
          type: 'pageview',
          url: 'https://example.com/help?search=private#anchor',
        }),
      ).toEqual({ type: 'pageview', url: 'https://example.com/help' });
      expect(
        send({ type: 'pageview', url: 'https://example.com/accounting' }),
      ).not.toBeNull();
    }
    act(() => {
      window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGED_EVENT));
    });
    expect(
      analytics.beforeSend?.({ type: 'pageview', url: 'https://example.com/' }),
    ).toBeNull();
    unmount();
    expect(remove).toHaveBeenCalledWith(
      COOKIE_CONSENT_CHANGED_EVENT,
      expect.any(Function),
    );
  });
  it('starts replay once and stops without flushing on revocation and unmount', async () => {
    const { unmount } = render(<Replay />);
    await waitFor(() =>
      expect(mocks.add).toHaveBeenCalledWith({ stop: mocks.stop }),
    );
    act(() => {
      window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGED_EVENT));
    });
    expect(mocks.stop).toHaveBeenCalledWith({ flush: false });
    unmount();
    expect(mocks.stop).toHaveBeenCalledTimes(2);
  });
  it('does not initialize replay if consent is withdrawn before the import resolves', async () => {
    render(<Replay />);
    act(() => {
      window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGED_EVENT));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.replay).not.toHaveBeenCalled();
  });
  it('stops replay if consent is withdrawn while the integration is being registered', async () => {
    mocks.add.mockImplementationOnce(() => {
      window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGED_EVENT));
    });
    render(<Replay />);
    await waitFor(() =>
      expect(mocks.stop).toHaveBeenCalledWith({ flush: false }),
    );
    expect(mocks.replay).toHaveBeenCalledOnce();
  });
  it('reports integration and stop failures', async () => {
    const integrationError = new Error('integration');
    mocks.replay.mockImplementationOnce(() => {
      throw integrationError;
    });
    const first = render(<Replay />);
    await waitFor(() =>
      expect(mocks.capture).toHaveBeenCalledWith(integrationError),
    );
    first.unmount();
    const stopError = new Error('stop');
    mocks.stop.mockRejectedValueOnce(stopError);
    const second = render(<Replay />);
    await waitFor(() => expect(mocks.add).toHaveBeenCalledOnce());
    second.unmount();
    await waitFor(() => expect(mocks.capture).toHaveBeenCalledWith(stopError));
  });
});
