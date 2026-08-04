import type { LocalizationResource } from '@clerk/shared/types';
import type { LocalePrefixMode } from 'next-intl/routing';
import type { AppLocale } from '@/types/I18n';
import { enUS, frFR, koKR } from '@clerk/localizations';

/** Locale prefix strategy for next-intl routing. */
const localePrefix: LocalePrefixMode = 'as-needed';

// Korean is the default: the product targets Korean apparel sellers and the
// generated label itself is a Korean statutory document. With the `as-needed`
// prefix strategy that makes `/` Korean and `/en`, `/fr` prefixed.
const locales = [
  {
    id: 'ko',
    name: '한국어',
  },
  {
    id: 'en',
    name: 'English',
  },
  {
    id: 'fr',
    name: 'Français',
  },
] satisfies AppLocale[];

/** Centralized application configuration */
export const AppConfig = {
  name: 'Smart Label Generator',
  i18n: {
    locales,
    defaultLocale: 'ko',
    localePrefix,
  },
  email: {
    support: 'contact@nextjs-boilerplate.com',
  },
} as const;

const supportedLocales: Record<string, LocalizationResource> = {
  ko: koKR,
  en: enUS,
  fr: frFR,
};

export const ClerkLocalizations = {
  defaultLocale: koKR,
  supportedLocales,
};

export const AllLocales = AppConfig.i18n.locales.map(locale => locale.id);
