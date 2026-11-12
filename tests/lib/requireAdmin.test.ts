// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  hasAdminRole: vi.fn(),
  logServerError: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  auth: { getSession: mocks.getSession },
}));

vi.mock('@/lib/auth/roles', () => ({
  hasAdminRole: mocks.hasAdminRole,
}));

vi.mock('@/lib/serverLogger', () => ({
  logServerError: mocks.logServerError,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.redirect.mockImplementation(() => {
    throw new Error('REDIRECT');
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('requireAdmin', () => {
  it('throws when session fetch returns an error', async () => {
    mocks.getSession.mockResolvedValue({
      data: null,
      error: new Error('Network error'),
    });

    const { requireAdmin } = await import('@/lib/admin/requireAdmin');

    await expect(requireAdmin()).rejects.toThrow(
      'Nie można zweryfikować sesji administratora.',
    );
    expect(mocks.logServerError).toHaveBeenCalledWith(
      'admin.requireAdmin',
      new Error('Network error'),
    );
  });

  it('redirects to sign-in when no session user', async () => {
    mocks.getSession.mockResolvedValue({ data: null, error: null });

    const { requireAdmin } = await import('@/lib/admin/requireAdmin');

    await expect(requireAdmin()).rejects.toThrow('REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('throws when user does not have admin role', async () => {
    mocks.getSession.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@test.pl', role: 'user' } },
      error: null,
    });
    mocks.hasAdminRole.mockReturnValue(false);

    const { requireAdmin } = await import('@/lib/admin/requireAdmin');

    await expect(requireAdmin()).rejects.toThrow(
      'Brak uprawnień administratora.',
    );
  });

  it('returns user when session is valid and user is admin', async () => {
    const user = { id: 'admin-1', email: 'admin@test.pl', role: 'admin' };
    mocks.getSession.mockResolvedValue({ data: { user }, error: null });
    mocks.hasAdminRole.mockReturnValue(true);

    const { requireAdmin } = await import('@/lib/admin/requireAdmin');

    const result = await requireAdmin();
    expect(result).toBe(user);
  });
});
