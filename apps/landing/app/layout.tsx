import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600'],
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rekaman.io'),
  title: {
    default: 'Rekaman — AR for any e-commerce store',
    template: '%s · Rekaman',
  },
  description:
    'Add "View in your room" augmented reality to your product pages in 20 minutes. AI generates 3D models from your photos. Works on Shopify, WooCommerce, and any custom store.',
  keywords: [
    'augmented reality e-commerce',
    'AR product visualization',
    'WebXR shopping',
    '3D product viewer',
    'Shopify AR',
    'WooCommerce AR',
    'spatial commerce India',
  ],
  authors: [{ name: 'Rekaman' }],
  creator: 'Rekaman',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://rekaman.io',
    title: 'Rekaman — AR for any e-commerce store',
    description:
      'AR for product pages in 20 minutes. AI-generated 3D from photos. One line of code.',
    siteName: 'Rekaman',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rekaman — AR for any e-commerce store',
    description: 'AR for product pages in 20 minutes. One line of code.',
    creator: '@rekaman_io',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
