import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './messages/en.json';
import he from './messages/he.json';

export const defaultLocale = 'he';
export const locales = ['he', 'en'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  he: 'עברית',
  en: 'English',
};

export const rtlLocales: Locale[] = ['he'];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: defaultLocale,
    supportedLngs: locales,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'filesmile-language',
    },
  });

// Update HTML attributes when language changes
i18n.on('languageChanged', (lng) => {
  const locale = lng as Locale;
  document.documentElement.lang = locale;
  document.documentElement.dir = getDirection(locale);
});

// Set initial HTML attributes
const initialLocale = i18n.language as Locale;
document.documentElement.lang = initialLocale;
document.documentElement.dir = getDirection(initialLocale);

export default i18n;
