// @vitest-environment node
import Page from '@/app/sentry-example-page/page';
import { Children, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sent: false,
  connected: true,
  setSent: vi.fn(),
  setConnected: vi.fn(),
  info: vi.fn(),
  diagnose: vi.fn(),
  span: vi.fn(),
  fetch: vi.fn(),
  effects: [] as (() => void)[],
  stateIndex: 0,
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: () =>
    mocks.stateIndex++ === 0
      ? [mocks.sent, mocks.setSent]
      : [mocks.connected, mocks.setConnected],
  useEffect: (effect: () => void) => {
    mocks.effects.push(effect);
  },
}));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('@sentry/nextjs', () => ({
  logger: { info: mocks.info },
  diagnoseSdkConnectivity: mocks.diagnose,
  startSpan: mocks.span,
}));

function clickHandler(node: ReactNode): (() => Promise<void>) | undefined {
  for (const child of Children.toArray(node)) {
    if (
      !isValidElement<{ children?: ReactNode; onClick?: () => Promise<void> }>(
        child,
      )
    )
      continue;
    if (child.type === 'button') return child.props.onClick;
    const nested = clickHandler(child.props.children);
    if (nested) return nested;
  }
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.sent = false;
  mocks.connected = true;
  mocks.stateIndex = 0;
  mocks.effects = [];
  mocks.diagnose.mockResolvedValue('sentry-connected');
  mocks.span.mockImplementation(
    async (_options, callback: () => Promise<void>) => callback(),
  );
  mocks.fetch.mockResolvedValue({ ok: false });
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Sentry diagnostic example', () => {
  it.each(['sentry-connected', 'sentry-unreachable'])(
    'checks connectivity: %s',
    async (result) => {
      mocks.diagnose.mockResolvedValue(result);
      Page();
      mocks.effects.forEach((effect) => effect());
      await vi.waitFor(() =>
        expect(mocks.setConnected).toHaveBeenCalledWith(
          result !== 'sentry-unreachable',
        ),
      );
      expect(mocks.info).toHaveBeenCalledWith('Sentry example page loaded');
    },
  );

  it.each([true, false])(
    'requests the backend then throws the intentional frontend error when response ok=%s',
    async (ok) => {
      mocks.fetch.mockResolvedValue({ ok });
      const handler = clickHandler(Page());
      if (!handler) throw new Error('Missing diagnostic button');
      await expect(handler()).rejects.toMatchObject({
        name: 'SentryExampleFrontendError',
        message: 'This error is raised on the frontend of the example page.',
      });
      expect(mocks.fetch).toHaveBeenCalledWith('/api/sentry-example-api');
      expect(mocks.span).toHaveBeenCalledWith(
        { name: 'Example Frontend/Backend Span', op: 'test' },
        expect.any(Function),
      );
      expect(mocks.setSent).toHaveBeenCalledTimes(ok ? 0 : 1);
    },
  );

  it.each([
    [true, true, 'Error sent to Sentry.'],
    [
      false,
      false,
      'It looks like network requests to Sentry are being blocked',
    ],
    [false, true, 'success_placeholder'],
  ] as const)('renders sent=%s connected=%s', (sent, connected, text) => {
    mocks.sent = sent;
    mocks.connected = connected;
    const markup = renderToStaticMarkup(Page());
    expect(markup).toContain(text);
    expect(markup.includes('disabled=""')).toBe(!connected);
  });
});
