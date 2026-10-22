// @vitest-environment node
import GlobalError from '@/app/global-error';
import { Children, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const capture = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException: capture }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useEffect: (effect: () => void) => effect(),
}));
beforeEach(() => {
  capture.mockReset();
});

describe('global error document', () => {
  it.each([undefined, 'global-123'])(
    'reports and retries the critical error with digest %s',
    (digest) => {
      const error = Object.assign(new Error('Global failure'), { digest });
      const retry = vi.fn();
      // The existing signature shadows native Error with the next/error component.
      // @ts-expect-error Runtime errors are native Error instances, not React components.
      const tree = GlobalError({ error, retry });
      const markup = renderToStaticMarkup(tree);
      expect(markup).toContain('lang="pl"');
      expect(markup).toContain('data-bs-theme="dark"');
      expect(markup.includes('Kod błędu:')).toBe(Boolean(digest));
      if (digest) expect(markup).toContain(digest);
      expect(capture).toHaveBeenCalledWith(error);
      const body = tree.props.children;
      const main = body.props.children;
      const button = Children.toArray(main.props.children).find(
        (child) => isValidElement(child) && child.type === 'button',
      );
      if (!isValidElement<{ onClick: () => void }>(button))
        throw new Error('Missing retry button');
      button.props.onClick();
      expect(retry).toHaveBeenCalledOnce();
    },
  );
});
