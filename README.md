This is a [Next.js](https://nextjs.org) project bootstrapped with
[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

## Community and contribution

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically
optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

### Privacy controls

Vercel Web Analytics and Speed Insights are mounted from the root layout only
when the current version of the `cookie-consent` cookie is `ACCEPT_OPTIONAL`.
Enable both products in the Vercel project dashboard before deployment.
Consent changes and clearing the preference reload the page to stop previously
loaded scripts. Both integrations strip query strings and fragments from event
URLs and drop events on auth, account, API and Terms acceptance routes.
Consent version 2 requires a new choice before enabling these measurements.

Account export at `/api/account/export` requires a signed-in session, but not
acceptance of the current Terms. A download link is available on `/terms/accept`.
The export scope is unchanged.

Upstash rate-limit identifiers use policy-specific HMAC-SHA-256 pseudonyms,
keyed with `INVOICE_DATA_ENCRYPTION_KEY` and a separate rate-limit domain prefix.
This key must be configured even for anonymous requests when Upstash is enabled.
Invalid or missing key configuration fails explicitly; raw identifiers are never
used as a fallback. Rotating the key resets rate-limit identities.
The `ratelimit:v2` namespace replaces the old raw-identifier namespace; old keys
are not reused and expire according to their existing TTL.

Application error logging uses fixed operation descriptions and allowlisted
Prisma error codes or HTTP status codes, without raw error messages, stacks,
request payloads or provider response bodies. Hosting and provider access logs
have their own settings and retention.

### Account deletion

Signed-in users can delete their account at `/auth/delete-account` without
accepting a new Terms version. The same form is available in account settings.
Identity is confirmed with a password or a sign-in email OTP sent to the
current account address (including passwordless accounts). Email OTP sign-in
and user deletion must be enabled in Neon Auth.

Application data is deleted transactionally before requesting identity deletion.
If identity deletion fails or requires an email confirmation, the form reports
that application data has already been removed. Terms acceptance evidence is
deleted in the same transaction, including unlinked entries matching the current
account email, unless explicitly retained for a concrete dispute. Contact messages
remain subject to their separate retention rules.

Before deleting an account involved in a concrete dispute, an authorized operator
can set `TermsAcceptance.retainedForDispute = true` on only the necessary records
and record an internal case reference in `disputeReference` (not the case contents).
These fields are not editable through user-facing forms. Review holds as part of
handling the case; do not use them for hypothetical future disputes.
Deletion marks retained records with `accountDeletionRequestedAt`. When retention
is no longer justified, set `retainedForDispute = false` and clear
`disputeReference`. The daily retention job deletes released records marked for
account deletion. Retained unlinked entries cannot be claimed by a new account
after an account deletion request.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions
are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the
[Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for
more details.
