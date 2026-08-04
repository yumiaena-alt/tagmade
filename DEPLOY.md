# Deployment

Live: <https://260804tag.vercel.app>

## Build command

`vercel.json` overrides the build with plain `next build`.

The package script `npm run build` is `db:migrate && next build`, which needs a
reachable Postgres. Locally that is the bundled PGlite server; on Vercel there is
none, so the migration step would fail the build. The studio and the marketing
pages never query the database, so skipping migrations costs nothing. If the
dashboard routes are ever needed in production, provision Postgres and run
`npm run db:migrate` as a separate step rather than putting it back in the build.

## Environment variables

Set on the Vercel project (Settings → Environment Variables):

| Variable | Why | Status |
| --- | --- | --- |
| `CLERK_SECRET_KEY` | `src/libs/Env.ts` validates it at build time, so the build fails without it | **Placeholder** — replace with a real key before relying on sign-in |
| `NEXT_PUBLIC_APP_URL` | Canonical, `hreflang` and sitemap URLs | Set to the production domain |
| `NEXT_PUBLIC_SENTRY_DISABLED` | Without a DSN and auth token Sentry only adds build noise and a failed source-map upload | `true` |

`.env` is committed and supplies `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` plus a
localhost `DATABASE_URL`, which is enough to satisfy env validation. Real secrets
belong in `.env.local` (git-ignored) or in Vercel, never in `.env`.

### Two things are not production-ready

1. **Auth.** `CLERK_SECRET_KEY` is a placeholder and the committed publishable
   key belongs to the upstream boilerplate's shared demo instance, not to this
   project. `/sign-in`, `/sign-up` and `/dashboard` will not work correctly.
   Create a Clerk application and set both keys to fix it. The label studio
   itself needs no account, so it is unaffected.
2. **Database.** There is none, so `/dashboard` fails at runtime. Attach Postgres
   and set `DATABASE_URL`, or remove the dashboard routes.

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
