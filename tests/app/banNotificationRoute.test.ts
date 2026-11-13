import { POST } from '@/app/api/admin/ban-notification/route';
import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendBanNotification = vi.fn();
const logServerError = vi.fn();

vi.mock('@/lib/email', () => ({
  sendBanNotification: (...args: unknown[]) => sendBanNotification(...args),
}));
vi.mock('@/lib/serverLogger', () => ({
  logServerError: (...args: unknown[]) => logServerError(...args),
}));

function request(body: unknown): NextRequest {
  return {
    json: () =>
      body instanceof Error ? Promise.reject(body) : Promise.resolve(body),
  } as unknown as NextRequest;
}

describe('POST /api/admin/ban-notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendBanNotification.mockResolvedValue(undefined);
  });

  it.each([[{ banReason: 'spam' }], [{ userEmail: 'a@b.pl' }]])(
    'returns 400 when required data is missing',
    async (body) => {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Brak wymaganych danych.',
      });
      expect(sendBanNotification).not.toHaveBeenCalled();
    },
  );

  it('sends the notification with the provided name', async () => {
    const response = await POST(
      request({ userEmail: 'a@b.pl', userName: 'Jan', banReason: 'spam' }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendBanNotification).toHaveBeenCalledWith({
      userName: 'Jan',
      userEmail: 'a@b.pl',
      banReason: 'spam',
    });
  });

  it('falls back to a default name', async () => {
    await POST(request({ userEmail: 'a@b.pl', banReason: 'spam' }));
    expect(sendBanNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userName: 'Użytkowniku' }),
    );
  });

  it('returns 500 and logs when sending fails', async () => {
    const error = new Error('smtp');
    sendBanNotification.mockRejectedValue(error);
    const response = await POST(
      request({ userEmail: 'a@b.pl', banReason: 'spam' }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Wystąpił błąd serwera.' });
    expect(logServerError).toHaveBeenCalledWith('ban-notification.api', error);
  });

  it('returns 500 for invalid JSON', async () => {
    const response = await POST(request(new Error('bad json')));
    expect(response.status).toBe(500);
    expect(logServerError).toHaveBeenCalled();
  });
});
