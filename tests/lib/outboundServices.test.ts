// @vitest-environment node
import { sendRetentionHeartbeat } from '@/lib/retentionHeartbeat';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  resend: vi.fn(),
  log: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('resend', () => ({ Resend: mocks.resend }));
vi.mock('@/lib/serverLogger', () => ({ logServerError: mocks.log }));
vi.mock('@/lib/siteUrl', () => ({ siteUrl: 'https://invoice.example.com' }));
const payload = {
  name: '<Jan & "Anna">',
  email: 'jan@example.com',
  subject: "Question's <subject>",
  message: '<script>bad</script>\nSecond & line',
  category: '<category>',
  userId: '<user>',
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
  vi.stubEnv('CONTACT_FROM_EMAIL', undefined);
  vi.stubEnv('CONTACT_NOTIFY_EMAIL', undefined);
  vi.stubEnv('CONTACT_REPLY_TO', undefined);
  vi.stubEnv('RETENTION_HEARTBEAT_URL', undefined);
  mocks.resend.mockImplementation(function () {
    return { emails: { send: mocks.send } };
  });
  mocks.send.mockResolvedValue({ data: { id: 'mail-1' }, error: null });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('transactional contact email', () => {
  it.each([
    'sendAdminContactNotification',
    'sendUserContactConfirmation',
  ] as const)(
    'explicitly skips %s without Resend configuration',
    async (method) => {
      vi.stubEnv('RESEND_API_KEY', undefined);
      const email = await import('@/lib/email');
      expect(email.resend).toBeNull();
      expect(await email[method](payload)).toEqual({
        ok: false,
        skipped: true,
      });
      expect(console.warn).toHaveBeenCalledOnce();
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );
  it('sends escaped administrator notifications with default headers and optional metadata', async () => {
    const email = await import('@/lib/email');
    expect(await email.sendAdminContactNotification(payload)).toEqual({
      ok: true,
      id: 'mail-1',
    });
    expect(mocks.resend).toHaveBeenCalledWith('test-resend-key');
    const message = mocks.send.mock.calls[0][0];
    expect(message).toMatchObject({
      from: 'Invoice Creator <kontakt@mail.draugskoll.dev>',
      to: ['contact@draugskoll.dev'],
      replyTo: `${payload.name} <jan@example.com>`,
      subject: `[Formularz kontaktowy] ${payload.subject}`,
    });
    expect(message.html).toContain('&lt;Jan &amp; &quot;Anna&quot;&gt;');
    expect(message.html).toContain('Question&#39;s &lt;subject&gt;');
    expect(message.html).toContain(
      '&lt;script&gt;bad&lt;/script&gt;<br />Second &amp; line',
    );
    expect(message.html).toContain('&lt;category&gt;');
    expect(message.html).toContain('&lt;user&gt;');
    expect(message.html).toContain('https://invoice.example.com');
    expect(message.html).not.toContain('<script>');
  });
  it('supports configured sender, notification recipient and omitted metadata', async () => {
    vi.stubEnv('CONTACT_FROM_EMAIL', 'sender@example.com');
    vi.stubEnv('CONTACT_NOTIFY_EMAIL', 'admin@example.com');
    const email = await import('@/lib/email');
    mocks.send.mockResolvedValue({ data: null, error: null });
    expect(
      await email.sendAdminContactNotification({
        ...payload,
        category: undefined,
        userId: null,
      }),
    ).toEqual({ ok: true, id: undefined });
    const message = mocks.send.mock.calls[0][0];
    expect(message).toMatchObject({
      from: 'sender@example.com',
      to: ['admin@example.com'],
    });
    expect(message.html).not.toContain('Kategoria:');
    expect(message.html).not.toContain('ID użytkownika:');
  });
  it('sends escaped confirmation to the caller using the default reply address', async () => {
    const email = await import('@/lib/email');
    expect(await email.sendUserContactConfirmation(payload)).toEqual({
      ok: true,
      id: 'mail-1',
    });
    const message = mocks.send.mock.calls[0][0];
    expect(message).toMatchObject({
      to: [`${payload.name} <jan@example.com>`],
      replyTo: 'kontakt@mail.draugskoll.dev',
      subject: `Potwierdzenie przyjęcia zgłoszenia: ${payload.subject}`,
    });
    expect(message.html).toContain('&lt;Jan &amp; &quot;Anna&quot;&gt;');
    expect(message.html).toContain('&lt;script&gt;bad&lt;/script&gt;<br />');
  });
  it('uses the configured confirmation reply address and accepts missing message ids', async () => {
    vi.stubEnv('CONTACT_REPLY_TO', 'support@example.com');
    mocks.send.mockResolvedValue({ data: null, error: null });
    const email = await import('@/lib/email');
    expect(await email.sendUserContactConfirmation(payload)).toEqual({
      ok: true,
      id: undefined,
    });
    expect(mocks.send.mock.calls[0][0].replyTo).toBe('support@example.com');
  });
  it.each([
    'sendAdminContactNotification',
    'sendUserContactConfirmation',
  ] as const)(
    'logs API rejection and thrown failures from %s',
    async (method) => {
      const email = await import('@/lib/email');
      const rejected = { message: 'Invalid sender' };
      mocks.send.mockResolvedValueOnce({ error: rejected });
      expect(await email[method](payload)).toEqual({ ok: false });
      expect(mocks.log).toHaveBeenLastCalledWith(expect.any(String), rejected);
      const error = new Error('network');
      mocks.send.mockRejectedValueOnce(error);
      expect(await email[method](payload)).toEqual({ ok: false });
      expect(mocks.log).toHaveBeenLastCalledWith(expect.any(String), error);
    },
  );
});

describe('retention heartbeat', () => {
  it('reports missing configuration without making an outbound request', async () => {
    expect(await sendRetentionHeartbeat()).toBe('not_configured');
    expect(console.warn).toHaveBeenCalledOnce();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    'invalid',
    'http://monitor.example.com',
    'https://user@monitor.example.com',
    'https://:password@monitor.example.com',
  ])('rejects invalid URL %s before fetching', async (url) => {
    vi.stubEnv('RETENTION_HEARTBEAT_URL', url);
    expect(await sendRetentionHeartbeat()).toBe('failed');
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.log).toHaveBeenCalledOnce();
  });
  it.each([true, false])(
    'cancels the body and reports HTTP success=%s',
    async (ok) => {
      vi.stubEnv('RETENTION_HEARTBEAT_URL', 'https://monitor.example.com/ping');
      const cancel = vi.fn();
      mocks.fetch.mockResolvedValue({
        ok,
        status: ok ? 200 : 503,
        body: { cancel },
      });
      expect(await sendRetentionHeartbeat()).toBe(ok ? 'sent' : 'failed');
      expect(cancel).toHaveBeenCalledOnce();
      expect(mocks.fetch).toHaveBeenCalledWith(
        new URL('https://monitor.example.com/ping'),
        {
          method: 'GET',
          cache: 'no-store',
          redirect: 'error',
          signal: expect.any(AbortSignal),
        },
      );
      if (!ok)
        expect(mocks.log).toHaveBeenCalledWith(expect.any(String), {
          statusCode: 503,
        });
    },
  );
  it('accepts body-less responses and logs network failures', async () => {
    vi.stubEnv('RETENTION_HEARTBEAT_URL', 'https://monitor.example.com');
    mocks.fetch.mockResolvedValueOnce({ ok: true, body: null });
    expect(await sendRetentionHeartbeat()).toBe('sent');
    const error = new Error('network');
    mocks.fetch.mockRejectedValueOnce(error);
    expect(await sendRetentionHeartbeat()).toBe('failed');
    expect(mocks.log).toHaveBeenLastCalledWith(
      '[retention-heartbeat] Failed to send heartbeat.',
      error,
    );
  });
});
