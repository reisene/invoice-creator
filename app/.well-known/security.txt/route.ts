export const dynamic = 'force-dynamic';

export function GET() {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + 180);

  const content = [
    'Contact: https://github.com/reisene/invoice-creator/security/advisories/new',
    'Contact: mailto:contact@draugskoll.dev',
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: pl, en',
    'Canonical: https://invoice-creator.draugskoll.dev/.well-known/security.txt',
    '',
  ].join('\n');

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
