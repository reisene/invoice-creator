// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';

type WidgetOptions = {
  sitekey: string;
  action: string;
  'error-callback': () => void;
};

type ScriptProps = {
  onReady?: () => void;
  onError?: () => void;
};

const mocks = vi.hoisted(() => ({
  scriptProps: null as ScriptProps | null,
}));

vi.mock('next/script', () => ({
  default: (props: ScriptProps) => {
    mocks.scriptProps = props;
    return null;
  },
}));

const { act, cleanup, render, screen } = testing;

async function loadWidget(siteKey?: string) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', siteKey);
  return (await import('@/components/TurnstileWidget')).default;
}

function triggerScriptCallback(name: keyof ScriptProps) {
  const callback =
    name === 'onReady'
      ? mocks.scriptProps?.onReady
      : mocks.scriptProps?.onError;
  if (!callback) throw new Error(`Missing Script ${name} callback`);
  act(callback);
}

beforeEach(() => {
  mocks.scriptProps = null;
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('TurnstileWidget', () => {
  it('explains when no public site key is configured', async () => {
    const TurnstileWidget = await loadWidget();

    render(<TurnstileWidget action='contact' resetSignal={false} />);

    expect(screen.getByRole('alert').textContent).toContain(
      'Weryfikacja antyspamowa jest niedostępna.',
    );
    expect(mocks.scriptProps).toBeNull();
  });

  it('renders the widget, resets it on signal changes, and removes it on unmount', async () => {
    const renderWidget = vi.fn<
      (container: HTMLElement, options: WidgetOptions) => string
    >(() => 'widget-1');
    const resetWidget = vi.fn();
    const removeWidget = vi.fn();
    vi.stubGlobal('turnstile', {
      render: renderWidget,
      reset: resetWidget,
      remove: removeWidget,
    });
    const TurnstileWidget = await loadWidget('test-site-key');
    const view = render(
      <TurnstileWidget action='contact' resetSignal={false} />,
    );

    triggerScriptCallback('onReady');

    const firstRender = renderWidget.mock.calls[0];
    expect(firstRender?.[0]).toBeInstanceOf(HTMLDivElement);
    expect(firstRender?.[1]).toEqual(
      expect.objectContaining({
        sitekey: 'test-site-key',
        action: 'contact',
        'error-callback': expect.any(Function),
      }),
    );

    view.rerender(<TurnstileWidget action='contact' resetSignal />);
    expect(resetWidget).toHaveBeenCalledWith('widget-1');

    view.rerender(<TurnstileWidget action='signup' resetSignal />);
    expect(removeWidget).toHaveBeenCalledWith('widget-1');
    const lastRender = renderWidget.mock.calls.at(-1);
    expect(lastRender?.[0]).toBeInstanceOf(HTMLDivElement);
    expect(lastRender?.[1]).toEqual(
      expect.objectContaining({ action: 'signup' }),
    );

    view.unmount();
    expect(removeWidget).toHaveBeenLastCalledWith('widget-1');
  });

  it('shows an error when the script fails to load', async () => {
    const TurnstileWidget = await loadWidget('test-site-key');

    render(<TurnstileWidget action='contact' resetSignal={false} />);
    triggerScriptCallback('onError');

    expect(screen.getByRole('alert').textContent).toContain(
      'Nie udało się załadować weryfikacji.',
    );
  });

  it('shows the widget error when Cloudflare reports a render failure', async () => {
    const renderWidget = vi.fn<
      (container: HTMLElement, options: WidgetOptions) => string
    >(() => 'widget-1');
    vi.stubGlobal('turnstile', {
      render: renderWidget,
      reset: vi.fn(),
      remove: vi.fn(),
    });
    const TurnstileWidget = await loadWidget('test-site-key');

    render(<TurnstileWidget action='contact' resetSignal={false} />);
    triggerScriptCallback('onReady');
    const options = renderWidget.mock.calls[0]?.[1];
    if (!options) throw new Error('Turnstile render options were not provided');
    act(options['error-callback']);

    expect(screen.getByRole('alert').textContent).toContain(
      'Nie udało się załadować weryfikacji.',
    );
  });

  it('waits for the API when the script is ready before the API is available', async () => {
    const TurnstileWidget = await loadWidget('test-site-key');

    const view = render(
      <TurnstileWidget action='contact' resetSignal={false} />,
    );
    triggerScriptCallback('onReady');

    const renderWidget = vi.fn<
      (container: HTMLElement, options: WidgetOptions) => string
    >(() => 'widget-1');
    vi.stubGlobal('turnstile', {
      render: renderWidget,
      reset: vi.fn(),
      remove: vi.fn(),
    });
    view.rerender(<TurnstileWidget action='signup' resetSignal={false} />);

    const latestRender = renderWidget.mock.calls.at(-1);
    expect(latestRender?.[0]).toBeInstanceOf(HTMLDivElement);
    expect(latestRender?.[1]).toEqual(
      expect.objectContaining({ action: 'signup' }),
    );
  });

  it('skips cleanup if the API is no longer available', async () => {
    const removeWidget = vi.fn();
    vi.stubGlobal('turnstile', {
      render: vi.fn(() => 'widget-1'),
      reset: vi.fn(),
      remove: removeWidget,
    });
    const TurnstileWidget = await loadWidget('test-site-key');
    const view = render(
      <TurnstileWidget action='contact' resetSignal={false} />,
    );
    triggerScriptCallback('onReady');

    delete window.turnstile;
    view.unmount();

    expect(removeWidget).not.toHaveBeenCalled();
  });
});
