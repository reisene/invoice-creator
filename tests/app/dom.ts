import { afterAll } from 'vitest';
import { builtinEnvironments } from 'vitest/runtime';

// Load jsdom after the worker handshake, outside Vitest's fixed startup timeout.
const environment = await builtinEnvironments.jsdom.setup(globalThis, {});
export const testing = await import('@testing-library/react/pure');
afterAll(async () => {
  testing.cleanup();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await environment.teardown(globalThis);
});
