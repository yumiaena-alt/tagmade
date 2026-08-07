'use client';

import type { AddableType } from '@/utils/documentModel';
import { useTranslations } from 'next-intl';

/**
 * Names of the addable element types.
 *
 * Shared by the layer panel's add row and the canvas toolbar so the two never
 * drift apart. Written as literal `t('add_…')` calls because a dynamic `t(key)`
 * satisfies neither next-intl's typed messages nor `check:i18n`.
 */
export function useAddElementLabels(): Record<AddableType, string> {
  const t = useTranslations('Studio');

  return {
    text: t('add_text'),
    rect: t('add_rect'),
    divider: t('add_divider'),
    barcode: t('add_barcode'),
    careSymbols: t('add_careSymbols'),
    qr: t('add_qr'),
    image: t('add_image'),
  };
}
