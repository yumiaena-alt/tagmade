import { permanentRedirect } from 'next/navigation';
import { getI18nPath } from '@/utils/Helpers';

type LabelPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Legacy path from before the studio existed. The generator now lives on `/`,
 * so this keeps old links and bookmarks working with one canonical URL.
 */
export default async function LabelPage(props: LabelPageProps) {
  const { locale } = await props.params;

  permanentRedirect(getI18nPath('/', locale));
}
