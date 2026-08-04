import type { NextFetchEvent, NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './libs/I18nRouting';

const handleI18nRouting = createMiddleware(routing);

const isAuthPage = createRouteMatcher([
  '/sign-in(.*)',
  '/:locale/sign-in(.*)',
  '/sign-up(.*)',
  '/:locale/sign-up(.*)',
]);

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  // Clerk keyless mode doesn't work with i18n, so Clerk only wraps the pages
  // that actually need it. Everything else — the studio, the marketing page —
  // is public and goes straight through i18n routing.
  if (isAuthPage(request)) {
    return clerkMiddleware(async (_auth, req) => handleI18nRouting(req))(
      request,
      event,
    );
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next`, `/_vercel` or `monitoring`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!_next|_vercel|monitoring|.*\\..*).*)',
};
