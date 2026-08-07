import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StudioShellLoader } from '@/features/studio/StudioShellLoader';
import { routing } from '@/libs/I18nRouting';
import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';
import { AllLocales } from '@/utils/AppConfig';

type IndexProps = {
  params: Promise<{ locale: string }>;
};

/** Home path for a locale: `/` for the default, `/{locale}` otherwise. */
function localeHome(locale: string): string {
  return locale === routing.defaultLocale ? '/' : `/${locale}`;
}

export async function generateMetadata(props: IndexProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      // Relative here; `metadataBase` in the root layout makes them absolute.
      canonical: localeHome(locale),
      // hreflang for every locale, so search engines serve the right language
      // instead of treating the translations as duplicates.
      languages: Object.fromEntries(AllLocales.map(id => [id, localeHome(id)])),
    },
  };
}

export default async function Index(props: IndexProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'Hero' });

  return (
    <>
      <Navbar />

      {/*
        The page is the editor: one server-rendered H1 above the studio, and
        nothing below it. The marketing sections that used to follow were
        boilerplate copy about the starter kit, not about this product.

        The H1 stays a server component because the studio itself is
        client-only (`ssr:false`) — without it the URL would have no indexable
        heading at all.
      */}
      <main>
        {/*
          Full-bleed rather than inside `Section`, whose centred max-w-5xl
          column is right for marketing copy and far too narrow for an editor —
          it left the canvas smaller than the panels around it.
        */}
        <div className="px-3 pt-4 pb-6">
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-balance">
            {t.rich('title', {
              important: chunks => (
                <span className="
                  bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500
                  bg-clip-text text-transparent
                "
                >
                  {chunks}
                </span>
              ),
            })}
          </h1>

          <StudioShellLoader />
        </div>
      </main>

      <Footer />
    </>
  );
};
