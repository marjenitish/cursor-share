import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Suspense } from 'react'; // Import Suspense
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'SHARE CRM | Exercise Classes for 50+',
    template: '%s | SHARE CRM'
  },
  description: 'SHARE CRM system for managing classes, instructors, and bookings for adults aged 50+',
  keywords: ['exercise', 'fitness', 'seniors', 'classes', 'health', 'wellbeing', '50+', 'active aging'],
  authors: [{ name: 'SHARE' }],
  creator: 'SHARE',
  publisher: 'SHARE',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://share.org.au/',
    siteName: 'SHARE CRM',
    title: 'SHARE CRM | Exercise Classes for 50+',
    description: 'SHARE CRM system for managing classes, instructors, and bookings for adults aged 50+',
    images: [
      {
        url: '/share-logo-seo.png',
        width: 1200,
        height: 630,
        alt: 'SHARE CRM',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SHARE CRM | Exercise Classes for 50+',
    description: 'SHARE CRM system for managing classes, instructors, and bookings for adults aged 50+',
    images: ['/share-logo-seo.png'],
    creator: '@SHARE',
  },
  icons: {
    icon: '/share-favicon.ico',
    shortcut: '/share-favicon.ico',
    apple: '/share-favicon.png',
  },
  manifest: '/site.webmanifest',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <Suspense fallback={<div>Loading application...</div>}> {/* Wrap children with Suspense */}
            {children}
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}