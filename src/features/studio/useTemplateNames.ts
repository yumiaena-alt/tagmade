'use client';

import { useTranslations } from 'next-intl';

/**
 * Display names of the built-in templates.
 *
 * Written as literal `t('tpl_…')` calls because a dynamic `t(key)` satisfies
 * neither next-intl's typed messages nor `check:i18n`. Shared by the gallery
 * and by the auto-namer, so a new document is called the same thing the
 * operator just clicked on.
 */
export function useTemplateNames(): Record<string, string> {
  const t = useTranslations('Studio');

  return {
    'care-label-standard': t('tpl_care_standard'),
    'care-label-wide': t('tpl_care_wide'),
    'care-label-mini': t('tpl_care_mini'),
    'hang-tag-classic': t('tpl_hang_classic'),
    'hang-tag-minimal': t('tpl_hang_minimal'),
    'hang-tag-square': t('tpl_hang_square'),
    'hang-tag-wide': t('tpl_hang_wide'),
    'import-label-full': t('tpl_import_full'),
    'import-label-compact': t('tpl_import_compact'),
    'import-label-portrait': t('tpl_import_portrait'),
    'kc-mark-micro': t('tpl_kc_micro'),
    'kc-mark-stacked': t('tpl_kc_stacked'),
    'kc-mark-wide': t('tpl_kc_wide'),
    'logistics-seal-polybag': t('tpl_logistics_polybag'),
    'logistics-seal-carton': t('tpl_logistics_carton'),
    'logistics-seal-small': t('tpl_logistics_small'),
    'custom-blank': t('tpl_custom_blank'),
    'custom-card': t('tpl_custom_card'),
  };
}
