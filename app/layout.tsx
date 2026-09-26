import AppNavbar from '@/components/AppNavbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const siteUrl: string = process.env.SITE_URL || 'localhost:3000';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Invoice Creator',
    template: '% | Invoice Creator',
  },
  description:
    'Invoice Creator is for creating invoices for contracts of mandate',
  metadataBase: new URL(siteUrl),
  icons: [
    {
      url: 'favicon.ico',
      type: 'image/x-icon',
      rel: 'icon',
    },
  ],
  authors: [{ name: 'DraugSköll', url: 'https://github.com/reisene' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang='en'
      className={`${geistSans.variable} ${geistMono.variable} vh-100`}
      data-bs-theme='dark'
    >
      <body className='min-vh-100 d-flex flex-column'>
        <AppNavbar />
        <main className={'py-5'}>{children}</main>
      </body>
    </html>
  );
}
