import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { RegisterSW } from '@/components/register-sw';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VitaOS',
  description: 'A tua central de saúde: biometria, treino em casa e nutrição num só lugar.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'VitaOS',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
