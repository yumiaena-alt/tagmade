import { useTranslations } from 'next-intl';
import { AppConfig } from '@/utils/AppConfig';

/**
 * Footer: the logo, the copyright line, and the legal links.
 *
 * The site-map columns and the social icon row that the boilerplate shipped
 * here are gone — every one of them pointed at `/sign-up`, and none of the
 * accounts they implied exist.
 */
export const CenteredFooter = (props: {
  logo: React.ReactNode;
  name: string;
  legalLinks: React.ReactNode;
}) => {
  const t = useTranslations('Footer');

  return (
    <div className="flex flex-col items-center text-center">
      {props.logo}

      <div className="
        mt-6 flex w-full items-center justify-between gap-y-2 border-t pt-3
        text-sm text-muted-foreground
        max-md:flex-col
      "
      >
        <div>
          {t('footer_text', {
            year: new Date().getFullYear(),
            name: AppConfig.name,
          })}
        </div>

        <ul className="
          flex gap-x-4 font-medium
          [&_a:hover]:opacity-60
        "
        >
          {props.legalLinks}
        </ul>
      </div>
    </div>
  );
};
