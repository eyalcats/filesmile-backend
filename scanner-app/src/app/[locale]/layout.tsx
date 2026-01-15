import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale, getDirection } from '@/i18n/config';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/auth';
import { HtmlAttributesUpdater } from '@/components/html-attributes-updater';

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
    <NextIntlClientProvider messages={messages}>
      <HtmlAttributesUpdater lang={locale} dir={dir} />
      <AuthProvider>
        {children}
      </AuthProvider>
      <Toaster position={dir === 'rtl' ? 'top-left' : 'top-right'} />
    </NextIntlClientProvider>
  );
}
