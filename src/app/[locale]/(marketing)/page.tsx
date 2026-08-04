import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Section } from '@/features/landing/Section';
import { StudioShellLoader } from '@/features/studio/StudioShellLoader';
import { routing } from '@/libs/I18nRouting';
import { CTA } from '@/templates/CTA';
import { DemoBanner } from '@/templates/DemoBanner';
import { FAQ } from '@/templates/FAQ';
import { Features } from '@/templates/Features';
import { Footer } from '@/templates/Footer';
import { Hero } from '@/templates/Hero';
import { Navbar } from '@/templates/Navbar';
import { Pricing } from '@/templates/Pricing';
import { Sponsors } from '@/templates/Sponsors';
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

  const tStudio = await getTranslations({ locale, namespace: 'Studio' });

  return (
    <>
      <DemoBanner />
      <Navbar />

      {/*
        The studio sits above the fold so a visitor can pick a template and edit
        immediately. Its heading and lede are server-rendered because the canvas
        itself is client-only. Everything below is the existing marketing page,
        unchanged, which is what keeps this URL worth indexing.
      */}
      <main>
        <Section className="pt-6 pb-12">
          <header className="mb-8 max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-balance">
              {tStudio('page_heading')}
            </h1>
            <p className="mt-4 text-lg/relaxed text-muted-foreground">
              {tStudio('page_lede')}
            </p>
          </header>

          <StudioShellLoader />
        </Section>

        <Hero />
        <Sponsors />
        <Features />
        <Pricing />
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </>
  );
};
