import AppNavbar from '@/components/AppNavbar';
import Footer from '@/components/Footer';
import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { IconType } from 'react-icons';
import { BsGithub } from 'react-icons/bs';
import './globals.css';

const siteUrl: string = process.env.SITE_URL || 'localhost:3000';
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
  authors: [{ name: author.name, url: author.url }],
  publisher: author.name,
  creator: author.name,
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
        <Footer author={author} />
      </body>
    </html>
  );
}
