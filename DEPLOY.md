# Deployment

Live: <https://260804tag.vercel.app>

## Build command

Plain `next build` (the `build` script). Nothing to override in `vercel.json`.

Earlier this project carried a Drizzle/PGlite database layer and the build ran
migrations first, which cannot work on Vercel. The database was never queried by
any page, so it was removed along with the dashboard and organization screens.

## Environment variables

Set on the Vercel project (Settings → Environment Variables):

| Variable | Why | Status |
| --- | --- | --- |
| `CLERK_SECRET_KEY` | `src/libs/Env.ts` validates it at build time, so the build fails without it | **Placeholder** — replace with a real key before relying on sign-in |
| `NEXT_PUBLIC_APP_URL` | Canonical, `hreflang` and sitemap URLs | Set to the production domain |
| `NEXT_PUBLIC_SENTRY_DISABLED` | Without a DSN and auth token Sentry only adds build noise and a failed source-map upload | `true` |

`.env` is committed and supplies `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Real
secrets belong in `.env.local` (git-ignored) or in Vercel, never in `.env`.

### One thing is not production-ready

**Auth.** `CLERK_SECRET_KEY` is a placeholder and the committed publishable key
belongs to the upstream boilerplate's shared demo instance, not to this project,
so `/sign-in` and `/sign-up` will not work correctly. Create a Clerk application
and set both keys to fix it. The label studio needs no account and is unaffected.

## Base URL resolution

`getBaseUrl()` in `src/utils/Helpers.ts` prefers, in order:

1. `NEXT_PUBLIC_APP_URL`
2. `VERCEL_PROJECT_PRODUCTION_URL` — the project's stable domain
3. `VERCEL_URL` — per-deployment host, correct for previews
4. `http://localhost:3001`

Order matters: `VERCEL_URL` changes on every deployment, so preferring it on
production would rewrite every canonical and `hreflang` URL each time and split
the indexed pages across throwaway hostnames.

## Fonts

`public/fonts/NanumGothic-*.ttf` (~4MB) are committed on purpose. The PDF
exporter registers them at runtime; the fonts bundled with
`@react-pdf/renderer` have no Hangul coverage, so without these every Korean
glyph exports blank.
