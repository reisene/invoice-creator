export function ServiceAddress() {
  const siteUrl =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();

  return siteUrl ? <a href={siteUrl}>{siteUrl}</a> : null;
}

export function ContactEmail() {
  const contactEmail = process.env.CONTACT_REPLY_TO?.trim();

  return contactEmail ? (
    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
  ) : null;
}

export function ServiceProviderIdentity() {
  const name = process.env.SERVICE_PROVIDER_NAME?.trim() ?? '';
  const address = process.env.SERVICE_PROVIDER_ADDRESS?.trim() ?? '';

  return (
    <>
      {name}, {address}, osoba fizyczna działająca prywatnie, bez
      zarejestrowanej działalności gospodarczej
    </>
  );
}
