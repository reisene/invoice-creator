// @vitest-environment node
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: vi.fn(),
  adapter: vi.fn(),
  serverAuth: vi.fn(),
  clientAuth: vi.fn(),
  findMany: vi.fn(),
  log: vi.fn(),
}));
vi.mock('@/generated/prisma', () => ({ PrismaClient: mocks.prisma }));
vi.mock('@prisma/adapter-neon', () => ({ PrismaNeon: mocks.adapter }));
vi.mock('@neondatabase/auth/next/server', () => ({
  createNeonAuth: mocks.serverAuth,
}));
vi.mock('@neondatabase/auth/next', () => ({
  createAuthClient: mocks.clientAuth,
}));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.adapter.mockImplementation(function () {
    return { adapter: true };
  });
  mocks.prisma.mockImplementation(function () {
    return { taxParam: { findMany: mocks.findMany } };
  });
  mocks.serverAuth.mockReturnValue({ session: true });
  mocks.clientAuth.mockReturnValue({ client: true });
});
afterEach(() => {
  vi.unstubAllEnvs();
});
describe('database and auth module wiring', () => {
  it('constructs the database client with the pooled Neon adapter', async () => {
    vi.stubEnv('DATABASE_URL_POOLED', 'postgresql://db.example.com/test');
    const { prisma } = await import('@/lib/db');
    expect(mocks.adapter).toHaveBeenCalledWith({
      connectionString: 'postgresql://db.example.com/test',
    });
    expect(mocks.prisma).toHaveBeenCalledWith({ adapter: { adapter: true } });
    expect(prisma).toHaveProperty('taxParam');
  });
  it('passes auth URL and cookie secret to the server SDK and constructs the browser client', async () => {
    vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.com');
    vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'test-cookie-secret');
    expect((await import('@/lib/auth/server')).auth).toEqual({ session: true });
    expect(mocks.serverAuth).toHaveBeenCalledWith({
      baseUrl: 'https://auth.example.com',
      cookies: { secret: 'test-cookie-secret' },
    });
    expect((await import('@/lib/auth/client')).authClient).toEqual({
      client: true,
    });
    expect(mocks.clientAuth).toHaveBeenCalledWith();
  });
});
describe('tax parameter loading', () => {
  it('maps every Decimal field to numbers and keeps ascending database order', async () => {
    const record = Object.fromEntries(
      Object.entries(DEFAULT_TAX_PARAMS).map(([key, value]) => [
        key,
        ['year', 'zusLimitMultiple'].includes(key)
          ? value
          : { toNumber: () => value },
      ]),
    );
    mocks.findMany.mockResolvedValue([record]);
    const { getAllTaxParams } = await import('@/lib/invoice/taxParams');
    expect(await getAllTaxParams()).toEqual([DEFAULT_TAX_PARAMS]);
    expect(mocks.findMany).toHaveBeenCalledWith({ orderBy: { year: 'asc' } });
  });
  it('uses default parameters when the database is empty', async () => {
    mocks.findMany.mockResolvedValue([]);
    const { getAllTaxParams } = await import('@/lib/invoice/taxParams');
    expect(await getAllTaxParams()).toEqual([DEFAULT_TAX_PARAMS]);
    expect(mocks.log).not.toHaveBeenCalled();
  });
  it('logs database errors before returning default parameters', async () => {
    const error = new Error('database unavailable');
    mocks.findMany.mockRejectedValue(error);
    const { getAllTaxParams } = await import('@/lib/invoice/taxParams');
    expect(await getAllTaxParams()).toEqual([DEFAULT_TAX_PARAMS]);
    expect(mocks.log).toHaveBeenCalledWith(
      'Failed to load tax params from database:',
      error,
    );
  });
});
