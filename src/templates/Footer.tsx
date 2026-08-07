import { useTranslations } from 'next-intl';
import { CenteredFooter } from '@/features/landing/CenteredFooter';
import { Section } from '@/features/landing/Section';
import { Link } from '@/libs/I18nNavigation';
import { AppConfig } from '@/utils/AppConfig';
import { Logo } from './Logo';

export const Footer = () => {
  const t = useTranslations('Footer');

  return (
    <Section className="pt-0 pb-16">
      <CenteredFooter
        logo={<Logo />}
        name={AppConfig.name}
        legalLinks={(
          <>
            <li>
              <Link href="/sign-up">{t('terms_of_service')}</Link>
            </li>
            <li>
              <Link href="/sign-up">{t('privacy_policy')}</Link>
            </li>
          </>
        )}
      />
    </Section>
  );
};
