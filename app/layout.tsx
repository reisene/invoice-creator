import AppNavbar from '@/components/AppNavbar';
import AuthButtons from '@/components/AuthButtons';
import CookieConsent from '@/components/CookieConsent';
import Footer from '@/components/Footer';
import { siteUrl } from '@/lib/siteUrl';
import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { IconType } from 'react-icons';
import { BsGithub } from 'react-icons/bs';
import './globals.css';

const author: { name: string; url: string; ico: IconType } = {
  name: 'DraugSköll',
  url: 'https://github.com/reisene',
  ico: BsGithub,
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteName = 'Invoice Creator';
const description =
  'Darmowy generator rachunków do umowy zlecenia: oblicza składki, zaliczkę na podatek i kwotę do wypłaty oraz tworzy gotowy plik PDF.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} – rachunki do umowy zlecenia`,
    template: `%s | ${siteName}`,
  },
  description,
  applicationName: siteName,
  keywords: [
    'rachunek do umowy zlecenia',
    'generator rachunków',
    'umowa zlecenie',
    'rachunek PDF',
  ],
  authors: [{ name: author.name, url: author.url }],
  publisher: author.name,
  creator: author.name,
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName,
    title: siteName,
    description,
    url: '/',
  },
  twitter: { card: 'summary', title: siteName, description },
  alternates: { canonical: '/' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang='pl'
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-bs-theme='dark'
    >
      <body className='min-vh-100 d-flex flex-column'>
        <AppNavbar authButtons={<AuthButtons />} />
        <main className='py-5 flex-grow-1'>{children}</main>
        <CookieConsent />
        <Footer author={author} />
      </body>
    </html>
  );
}
