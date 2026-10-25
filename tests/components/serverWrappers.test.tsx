// @vitest-environment node
import CookieConsent from '@/components/consent/CookieConsent';
import {
  ContactEmail,
  ServiceAddress,
  ServiceProviderIdentity,
} from '@/components/legal/LegalDocumentComponents';
import ConsentedSentryReplay from '@/components/telemetry/ConsentedSentryReplay';
import ConsentedTelemetry from '@/components/telemetry/ConsentedTelemetry';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const cookie = vi.hoisted(() => vi.fn());
vi.mock('next/headers', () => ({ cookies: async () => ({ get: cookie }) }));
vi.mock('@/components/consent/CookieConsentBanner', () => ({
  default: () => null,
}));
vi.mock('@/components/telemetry/VercelTelemetry', () => ({
  default: () => null,
}));
vi.mock('@/components/telemetry/ConsentedSentryReplayClient', () => ({
  default: () => null,
}));
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('server consent gates', () => {
  it.each([
    undefined,
    '2:ACCEPT_OPTIONAL',
    '3:REJECT_OPTIONAL',
    '3:ACCEPT_OPTIONAL',
    '3:invalid',
  ])(
    'loads persisted choice %j before rendering optional collection',
    async (value) => {
      cookie.mockReturnValue(value === undefined ? undefined : { value });
      expect((await CookieConsent()).props.initialChoice).toBe(
        value === '3:ACCEPT_OPTIONAL'
          ? 'ACCEPT_OPTIONAL'
          : value === '3:REJECT_OPTIONAL'
            ? 'REJECT_OPTIONAL'
            : null,
      );
      expect((await ConsentedTelemetry()) !== null).toBe(
        value === '3:ACCEPT_OPTIONAL',
      );
      expect((await ConsentedSentryReplay()) !== null).toBe(
        value === '3:ACCEPT_OPTIONAL',
      );
      expect(cookie).toHaveBeenCalledWith('cookie-consent');
    },
  );
});
describe('legal contact components', () => {
  it('renders configured trimmed addresses and escapes provider values', () => {
    vi.stubEnv('SITE_URL', ' https://site.example.com ');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://ignored.example.com');
    vi.stubEnv('CONTACT_REPLY_TO', ' support@example.com ');
    vi.stubEnv('SERVICE_PROVIDER_NAME', ' <Name> ');
    vi.stubEnv('SERVICE_PROVIDER_ADDRESS', ' Address ');
    expect(renderToStaticMarkup(<ServiceAddress />)).toContain(
      'href="https://site.example.com"',
    );
    expect(renderToStaticMarkup(<ContactEmail />)).toContain(
      'href="mailto:support@example.com"',
    );
    expect(renderToStaticMarkup(<ServiceProviderIdentity />)).toContain(
      '&lt;Name&gt;, Address',
    );
  });
  it('uses public URL fallback and handles missing or blank configuration', () => {
    vi.stubEnv('SITE_URL', ' ');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://public.example.com');
    expect(renderToStaticMarkup(<ServiceAddress />)).toContain(
      'https://public.example.com',
    );
    for (const name of [
      'SITE_URL',
      'NEXT_PUBLIC_SITE_URL',
      'CONTACT_REPLY_TO',
      'SERVICE_PROVIDER_NAME',
      'SERVICE_PROVIDER_ADDRESS',
    ])
      vi.stubEnv(name, undefined);
    expect(renderToStaticMarkup(<ServiceAddress />)).toBe('');
    expect(renderToStaticMarkup(<ContactEmail />)).toBe('');
    expect(renderToStaticMarkup(<ServiceProviderIdentity />)).toContain(
      'osoba fizyczna',
    );
  });
});
