// @vitest-environment node
import AppError from '@/app/error';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './dom';
import { testing } from './dom';

const { cleanup, fireEvent, render, screen } = testing;
const capture = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException: capture }));
beforeEach(() => {
  capture.mockReset();
});
afterEach(cleanup);

describe('error boundaries', () => {
  it.each([undefined, 'trace-123'])(
    'reports route errors and retries with digest %s',
    (digest) => {
      const error = Object.assign(new Error('Route failure'), { digest });
      const retry = vi.fn();
      const { rerender } = render(<AppError error={error} retry={retry} />);
      expect(capture).toHaveBeenCalledWith(error);
      expect(screen.queryByText('trace-123') !== null).toBe(Boolean(digest));
      expect(
        screen
          .getByRole('button', { name: 'Strona główna' })
          .getAttribute('href'),
      ).toBe('/');
      fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
      expect(retry).toHaveBeenCalledOnce();
      const changed = new Error('Another error');
      rerender(<AppError error={changed} retry={retry} />);
      expect(capture).toHaveBeenLastCalledWith(changed);
      expect(screen.queryByText('trace-123')).toBeNull();
    },
  );
});
