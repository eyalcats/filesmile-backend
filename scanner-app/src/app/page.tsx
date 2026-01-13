import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n/config';

// Redirect root to default locale
// With localePrefix: 'always', all pages require a locale prefix
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
