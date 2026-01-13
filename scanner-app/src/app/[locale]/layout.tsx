import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import { locales, type Locale, getDirection } from '@/i18n/config';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/auth';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const titles: Record<string, string> = {
    he: 'FileSmile - סורק',
    en: 'FileSmile - Scanner',
  };

  return {
    title: titles[locale] || titles.he,
    description: locale === 'he'
      ? 'סריקה והצמדת קבצים ל-Priority'
      : 'Scan and attach files to Priority',
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();
  const dir = getDirection(locale as Locale);

  return (
    <html lang={locale} dir={dir}>
      <head>
        {/* Required for VintaSoft SDK - ensures referrer header is sent to localhost service */}
        <meta name="referrer" content="origin-when-cross-origin" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster position={dir === 'rtl' ? 'top-left' : 'top-right'} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
