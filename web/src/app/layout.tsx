import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/Providers';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PRINT BAZZAR 2.0 | Customer-to-Production Operating System',
  description: 'Production-grade Operating System for Commercial Printing, Custom Packaging, Signage & Corporate Merchandise.',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '180x180', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/logo-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} overflow-x-clip`} suppressHydrationWarning>
      <body
        className="min-h-screen w-full max-w-full overflow-x-clip bg-[#F8F8F8] flex flex-col font-sans text-black antialiased selection:bg-[#FFED00] selection:text-black"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


