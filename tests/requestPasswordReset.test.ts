import { requestPasswordReset } from '@/app/auth/forgot-password/actions';
import { auth } from '@/lib/auth/server';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, vi } from 'vitest';

vi.mock('@/lib/auth/server', () => ({
  auth: { requestPasswordReset: vi.fn() },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ origin: 'https://example.com' })),
}));

describe('requestPasswordReset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['missing', 'empty', 'whitespace', 'file'])(
    'rejects a %s email without calling auth',
    async (kind) => {
      const formData = new FormData();
      if (kind === 'empty') formData.set('email', '');
      if (kind === 'whitespace') formData.set('email', '   ');
      if (kind === 'file') {
        formData.set('email', new File(['email'], 'email.txt'));
      }

      assert.deepEqual(await requestPasswordReset(null, formData), {
        error: 'Podaj adres e-mail.',
      });
      assert.equal(vi.mocked(auth.requestPasswordReset).mock.calls.length, 0);
    },
  );

  it('trims a valid email and requests a password reset', async () => {
    vi.mocked(auth.requestPasswordReset).mockResolvedValue({
      data: { status: true },
      error: null,
    });
    const formData = new FormData();
    formData.set('email', ' user@example.com ');

    assert.deepEqual(await requestPasswordReset(null, formData), {
      success: true,
    });
    assert.deepEqual(vi.mocked(auth.requestPasswordReset).mock.calls[0], [
      {
        email: 'user@example.com',
        redirectTo: 'https://example.com/auth/reset-password',
      },
    ]);
  });
});
