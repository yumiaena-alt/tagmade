'use client';

import { useTranslations } from 'next-intl';

/**
 * Field captions keyed by `TemplateField.labelKey`.
 *
 * Every lookup is written as a literal `t('field_…')` call so next-intl's typed
 * messages and `check:i18n`'s static scan both see the usage — a dynamic
 * `t(key)` would satisfy neither.
 */
export function useEditorFieldLabels(): Record<string, string> {
  const t = useTranslations('Editor');

  return {
    field_brand: t('field_brand'),
    field_product_name: t('field_product_name'),
    field_price: t('field_price'),
    field_qr_url: t('field_qr_url'),
    field_exchange_policy: t('field_exchange_policy'),
    field_importer: t('field_importer'),
    field_manufacturer: t('field_manufacturer'),
    field_country_of_origin: t('field_country_of_origin'),
    field_material: t('field_material'),
    field_size: t('field_size'),
    field_manufactured_on: t('field_manufactured_on'),
    field_caution: t('field_caution'),
    field_certification_number: t('field_certification_number'),
    field_sku: t('field_sku'),
    field_quantity: t('field_quantity'),
    field_box_number: t('field_box_number'),
    // Structural elements the studio can add to any document.
    field_composition: t('field_composition'),
    field_care_symbols: t('field_care_symbols'),
    field_text: t('field_text'),
    field_shape: t('field_shape'),
    field_divider: t('field_divider'),
    field_punch_hole: t('field_punch_hole'),
    field_barcode: t('field_barcode'),
    field_qr: t('field_qr'),
    field_image: t('field_image'),
  };
}
