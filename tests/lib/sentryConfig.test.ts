// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  initBotId: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  init: mocks.init,
  captureRouterTransitionStart: mocks.captureRouterTransitionStart,
}));
vi.mock('botid/client/core', () => ({ initBotId: mocks.initBotId }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('SENTRY_DSN', 'https://public@example.com/1');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.com/2');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE', '0.25');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Sentry data minimization', () => {
  it.each([
    ['browser', () => import('../../instrumentation-client'), '2'],
    ['server', () => import('../../sentry.server.config'), '1'],
    ['edge', () => import('../../sentry.edge.config'), '1'],
  ] as const)(
    'restricts automatic collection in %s without disabling diagnostics',
    async (_runtime, load, project) => {
      await load();

      expect(mocks.init).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          dsn: `https://public@example.com/${project}`,
          tracesSampleRate: 0.25,
          dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: false,
            httpBodies: [],
            urlQueryParams: false,
            databaseQueryData: false,
            stackFrameVariables: false,
          },
        }),
      );
    },
  );

  it('preserves browser replay sampling, navigation tracking and BotID', async () => {
    const client = await import('../../instrumentation-client');

    expect(mocks.init).toHaveBeenCalledWith(
      expect.objectContaining({
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1,
      }),
    );
    expect(client.onRouterTransitionStart).toBe(
      mocks.captureRouterTransitionStart,
    );
    expect(mocks.initBotId).toHaveBeenCalledExactlyOnceWith({
      protect: [{ path: '/contact', method: 'POST' }],
    });
  });
});
