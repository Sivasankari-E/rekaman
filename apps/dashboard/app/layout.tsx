import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://dashboard.rekaman.io'),
  title: {
    default: 'Rekaman Dashboard',
    template: '%s · Rekaman',
  },
  description: 'Manage your AR products, embed code, and analytics.',
  robots: { index: false },
  icons: {
    icon: '/brand/rekaman-icon.png',
    apple: '/brand/rekaman-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
