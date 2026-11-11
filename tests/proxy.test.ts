// @vitest-environment node
import proxy, { config } from '@/proxy';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  middleware: vi.fn(),
  session: vi.fn(),
  log: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  auth: {
    middleware: mocks.middleware.mockReturnValue(mocks.authenticate),
    getSession: mocks.session,
  },
}));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));

beforeEach(() => {
  mocks.authenticate.mockReset().mockResolvedValue(NextResponse.next());
  mocks.session.mockReset().mockResolvedValue({
    data: { user: { id: 'u1', role: 'admin' } },
    error: null,
  });
  mocks.log.mockReset();
});

const request = (path = '/admin') =>
  new NextRequest(`https://example.com${path}`);

describe('protected route proxy', () => {
  it('configures Neon Auth login protection for account and all admin paths', async () => {
    vi.resetModules();
    mocks.middleware.mockClear();
    await import('@/proxy');
    expect(mocks.middleware).toHaveBeenCalledExactlyOnceWith({
      loginUrl: '/auth/sign-in',
    });
    expect(config.matcher).toEqual(['/account/:path*', '/admin/:path*']);
  });

  it.each(['/account', '/account/invoices', '/administrator'])(
    'preserves authentication behavior outside the admin tree: %s',
    async (path) => {
      const response = NextResponse.next();
      mocks.authenticate.mockResolvedValue(response);
      const req = request(path);
      expect(await proxy(req)).toBe(response);
      expect(mocks.authenticate).toHaveBeenCalledExactlyOnceWith(req);
      expect(mocks.session).not.toHaveBeenCalled();
    },
  );

  it('preserves login redirects and refreshed cookies from Neon Auth', async () => {
    const response = NextResponse.redirect('https://example.com/auth/sign-in');
    response.cookies.set('session', 'refreshed');
    mocks.authenticate.mockResolvedValue(response);
    expect(await proxy(request())).toBe(response);
    expect(response.status).toBe(307);
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it.each(['/admin', '/admin/', '/admin/settings/users'])(
    'allows authenticated admins at %s and preserves the SDK response',
    async (path) => {
      const response = NextResponse.next();
      response.cookies.set('session', 'refreshed');
      mocks.authenticate.mockResolvedValue(response);
      expect(await proxy(request(path))).toBe(response);
      expect(mocks.session).toHaveBeenCalledOnce();
      expect(mocks.log).not.toHaveBeenCalled();
    },
  );

  it('allows admin among multiple Neon Auth roles', async () => {
    mocks.session.mockResolvedValue({
      data: { user: { id: 'u1', role: 'user, admin' } },
      error: null,
    });
    expect((await proxy(request())).headers.get('x-middleware-next')).toBe('1');
  });

  it.each([undefined, null, '', 'user', 'superadmin', 'ADMIN'])(
    'denies authenticated users without the admin role: %s',
    async (role) => {
      mocks.session.mockResolvedValue({
        data: { user: { id: 'u1', role } },
        error: null,
      });
      const response = await proxy(request('/admin/settings'));
      expect(response.status).toBe(403);
      expect(await response.text()).toBe('Brak uprawnień administratora.');
      expect(response.headers.has('x-middleware-next')).toBe(false);
      expect(mocks.log).not.toHaveBeenCalled();
    },
  );

  it.each([null, { user: null }])(
    'redirects to login if the subsequent session is missing: %j',
    async (data) => {
      mocks.session.mockResolvedValue({ data, error: null });
      const response = await proxy(request());
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        'https://example.com/auth/sign-in',
      );
    },
  );

  it('logs session errors and fails closed even when user data is present', async () => {
    const error = { code: 'NETWORK_ERROR', message: 'private upstream detail' };
    mocks.session.mockResolvedValue({
      data: { user: { id: 'u1', role: 'admin' } },
      error,
    });
    const response = await proxy(request());
    expect(response.status).toBe(503);
    expect(await response.text()).toBe(
      'Nie można zweryfikować sesji. Spróbuj ponownie.',
    );
    expect(mocks.log).toHaveBeenCalledExactlyOnceWith('admin.session', error);
    expect(response.headers.has('x-middleware-next')).toBe(false);
  });

  it('propagates authentication failures without checking roles or granting access', async () => {
    const error = new Error('SDK unavailable');
    mocks.authenticate.mockRejectedValue(error);
    await expect(proxy(request())).rejects.toBe(error);
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it('propagates unexpected session failures without granting access', async () => {
    const error = new Error('session unavailable');
    mocks.session.mockRejectedValue(error);
    await expect(proxy(request())).rejects.toBe(error);
  });
});
