import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Env } from '@/libs/Env';
import { routing } from '@/libs/I18nRouting';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves the public base URL of the application.
 * @returns The configured public app URL or the local development URL.
 */
export const getBaseUrl = () => {
  if (Env.NEXT_PUBLIC_APP_URL) {
    return Env.NEXT_PUBLIC_APP_URL;
  }

  // On Vercel, prefer the stable production domain over the per-deployment
  // host. `VERCEL_URL` changes on every deploy, so using it would rewrite the
  // canonical and hreflang URLs each time and split the indexed pages.
  const vercelHost
    = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
      ?? process.env.NEXT_PUBLIC_VERCEL_URL
      ?? process.env.VERCEL_URL;

  if (vercelHost) {
    return `https://${vercelHost}`;
  }

  return 'http://localhost:3001';
};

/**
 * Builds a locale-aware path by prefixing non-default locales.
 * @param url The base application-relative path starting with a slash.
 * @param locale The active locale identifier.
 * @returns The localized path, prefixed when the locale is not the default locale.
 */
export const getI18nPath = (url: string, locale: string) => {
  if (locale === routing.defaultLocale) {
    return url;
  }

  return `/${locale}${url}`;
};
