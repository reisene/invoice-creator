// @vitest-environment node
import { getCurrentUserId, getCurrentUserIdWithTerms } from '@/lib/currentUser';
import {
  claimPendingMagicLinkAcceptance,
  getPendingMagicLinkAcceptanceCutoff,
  hasCurrentTermsAcceptance,
  recordTermsAcceptance,
} from '@/lib/legal/recordTermsAcceptance';
import type { RegistrationConsent } from '@/lib/legal/termsAcceptance';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  unique: vi.fn(),
  first: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  upsert: vi.fn(),
  document: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({ auth: { getSession: mocks.session } }));
vi.mock('@/lib/db', () => ({
  prisma: {
    termsAcceptance: {
      findUnique: mocks.unique,
      findFirst: mocks.first,
      updateMany: mocks.update,
      create: mocks.create,
      upsert: mocks.upsert,
    },
  },
}));
vi.mock('@/lib/legal/legalDocuments', () => ({
  getCurrentLegalDocument: mocks.document,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
const consent: RegistrationConsent = {
  email: 'JAN@EXAMPLE.COM',
  termsVersion: 'v3',
  registrationMethod: 'MAGIC_LINK',
  earlyServiceStartRequested: true,
};
const now = new Date('2026-05-01T12:00:00.000Z');
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  mocks.document.mockReturnValue({ version: 'v3' });
  mocks.unique.mockResolvedValue(null);
  mocks.first.mockResolvedValue(null);
  mocks.session.mockResolvedValue({ data: null });
  mocks.redirect.mockImplementation((path) => {
    throw new Error(`REDIRECT:${path}`);
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('terms acceptance persistence', () => {
  it.each([false, true])(
    'upserts authenticated consent with immediate start %s',
    async (immediate) => {
      await recordTermsAcceptance(
        { ...consent, earlyServiceStartRequested: immediate },
        'user-1',
      );
      expect(mocks.upsert).toHaveBeenCalledWith({
        where: {
          userId_termsVersion: { userId: 'user-1', termsVersion: 'v3' },
        },
        create: {
          ...consent,
          earlyServiceStartRequested: immediate,
          email: 'jan@example.com',
          userId: 'user-1',
          acceptedAt: now,
          earlyServiceStartRequestedAt: immediate ? now : null,
        },
        update: {},
      });
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it.each([false, true])(
    'records pending magic-link consent with immediate start %s',
    async (immediate) => {
      await recordTermsAcceptance({
        ...consent,
        earlyServiceStartRequested: immediate,
      });
      expect(mocks.create).toHaveBeenCalledWith({
        data: {
          ...consent,
          earlyServiceStartRequested: immediate,
          email: 'jan@example.com',
          acceptedAt: now,
          earlyServiceStartRequestedAt: immediate ? now : null,
        },
      });
    },
  );
  it.each(['EMAIL_PASSWORD', 'ACCOUNT_RECONSENT'] as const)(
    'rejects anonymous %s consent',
    async (method) => {
      await expect(
        recordTermsAcceptance({ ...consent, registrationMethod: method }),
      ).rejects.toThrow('authenticated user');
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.upsert).not.toHaveBeenCalled();
    },
  );
  it('computes the pending cutoff in UTC without changing the input', () => {
    expect(getPendingMagicLinkAcceptanceCutoff()).toEqual(
      new Date('2026-04-01T12:00:00Z'),
    );
    expect(getPendingMagicLinkAcceptanceCutoff(now)).toEqual(
      new Date('2026-04-01T12:00:00Z'),
    );
    expect(now.toISOString()).toBe('2026-05-01T12:00:00.000Z');
  });
  it('checks acceptance of the currently effective version', async () => {
    expect(await hasCurrentTermsAcceptance('user-1')).toBe(false);
    mocks.unique.mockResolvedValue({ id: 'acceptance' });
    expect(await hasCurrentTermsAcceptance('user-1')).toBe(true);
    expect(mocks.unique).toHaveBeenLastCalledWith({
      where: { userId_termsVersion: { userId: 'user-1', termsVersion: 'v3' } },
    });
  });
  it('does not claim pending consent when the user already accepted', async () => {
    mocks.unique.mockResolvedValue({ id: 'existing' });
    await claimPendingMagicLinkAcceptance('user-1', 'jan@example.com');
    expect(mocks.first).not.toHaveBeenCalled();
  });
  it('claims only recent, current, undeleted magic-link consent for the normalized email', async () => {
    mocks.first.mockResolvedValue({ id: 'pending' });
    await claimPendingMagicLinkAcceptance('user-1', ' JAN@EXAMPLE.COM ');
    expect(mocks.first).toHaveBeenCalledWith({
      where: {
        userId: null,
        email: 'jan@example.com',
        termsVersion: 'v3',
        registrationMethod: 'MAGIC_LINK',
        accountDeletionRequestedAt: null,
        acceptedAt: { gte: new Date('2026-04-01T12:00:00Z') },
      },
      orderBy: { acceptedAt: 'desc' },
      select: { id: true },
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'pending', userId: null, accountDeletionRequestedAt: null },
      data: { userId: 'user-1' },
    });
  });
  it('does nothing without a matching pending record', async () => {
    await claimPendingMagicLinkAcceptance('user-1', 'jan@example.com');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'handles a competing claim only when acceptance now exists: %s',
    async (accepted) => {
      mocks.unique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(accepted ? { id: 'existing' } : null);
      mocks.first.mockResolvedValue({ id: 'pending' });
      const error = new Error('unique conflict');
      mocks.update.mockRejectedValue(error);
      const result = claimPendingMagicLinkAcceptance(
        'user-1',
        'jan@example.com',
      );
      if (accepted) await expect(result).resolves.toBeUndefined();
      else await expect(result).rejects.toBe(error);
    },
  );
});

describe('current authenticated user', () => {
  it.each([null, {}, { user: {} }])(
    'returns null for missing identity %j',
    async (session) => {
      mocks.session.mockResolvedValue({ data: session });
      expect(await getCurrentUserId()).toBeNull();
      expect(await getCurrentUserIdWithTerms()).toBeNull();
      expect(mocks.unique).not.toHaveBeenCalled();
    },
  );
  it('returns the user id without requiring terms for the basic lookup', async () => {
    mocks.session.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    expect(await getCurrentUserId()).toBe('user-1');
    expect(mocks.unique).not.toHaveBeenCalled();
  });
  it.each([undefined, 'jan@example.com'])(
    'enforces acceptance with email %j',
    async (email) => {
      mocks.session.mockResolvedValue({
        data: { user: { id: 'user-1', email } },
      });
      mocks.unique.mockResolvedValue({ id: 'accepted' });
      expect(await getCurrentUserIdWithTerms()).toBe('user-1');
      expect(mocks.unique).toHaveBeenCalledTimes(email ? 2 : 1);
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );
  it('redirects an authenticated user without current acceptance', async () => {
    mocks.session.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    await expect(getCurrentUserIdWithTerms()).rejects.toThrow(
      'REDIRECT:/terms/accept',
    );
  });
  it('propagates authentication service errors', async () => {
    const error = new Error('auth unavailable');
    mocks.session.mockRejectedValue(error);
    await expect(getCurrentUserId()).rejects.toBe(error);
    await expect(getCurrentUserIdWithTerms()).rejects.toBe(error);
  });
});
