'use client';

import type { TemplateCategory } from '@/utils/templateCatalog';
import { useTranslations } from 'next-intl';
import { useDocumentStore } from '@/store/useDocumentStore';
import {
  TEMPLATE_CATEGORIES,
  templatesByCategory,
} from '@/utils/templateCatalog';
import { DocumentSvg } from './DocumentSvg';
import { MyTemplates } from './MyTemplates';
import { thumbSize } from './templateThumb';

/**
 * Browsable template list, grouped by category — the studio's equivalent of a
 * template sidebar. Picking one replaces the open document.
 */
export const TemplatePanel = () => {
  const t = useTranslations('Studio');
  const tCategory = useTranslations('TemplatePicker');
  const applyTemplate = useDocumentStore(state => state.applyTemplate);
  const currentTemplateId = useDocumentStore(state => state.doc.templateId);

  // Literal keys so typed messages and `check:i18n` both see the usage.
  const categoryNames: Record<TemplateCategory, string> = {
    'care-label': tCategory('mode_care_label_name'),
    'hang-tag': tCategory('mode_hang_tag_name'),
    'import-label': tCategory('mode_import_label_name'),
    'kc-mark': tCategory('mode_kc_mark_name'),
    'logistics-seal': tCategory('mode_logistics_seal_name'),
    'custom': tCategory('mode_custom_name'),
  };

  const templateNames: Record<string, string> = {
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

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-medium">{t('templates_heading')}</h2>

      <MyTemplates />

      {TEMPLATE_CATEGORIES.map(category => (
        <section key={category} className="space-y-2.5">
          <h3 className={`
            text-xs font-medium tracking-wide text-muted-foreground
          `}
          >
            {categoryNames[category]}
          </h3>

          <ul className="grid grid-cols-2 gap-2.5">
            {templatesByCategory(category).map((template) => {
              const size = thumbSize(
                template.document.widthMm,
                template.document.heightMm,
              );
              const isActive = template.id === currentTemplateId;

              return (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    aria-pressed={isActive}
                    className={`
                      group flex w-full cursor-pointer flex-col items-center
                      gap-1.5 rounded-lg border p-2 transition-colors
                      ${isActive
                  ? 'border-foreground bg-accent'
                  : `
                    border-border
                    hover:border-foreground/30 hover:bg-accent/60
                  `}
                    `}
                  >
                    <span className={`
                      flex h-[112px] w-full items-center justify-center
                      overflow-hidden rounded-md bg-white ring-1 ring-black/10
                    `}
                    >
                      <DocumentSvg
                        doc={template.document}
                        width={size.width}
                        height={size.height}
                      />
                    </span>

                    <span className="w-full space-y-0.5 text-center">
                      <span className="block truncate text-xs font-medium">
                        {templateNames[template.id] ?? template.id}
                      </span>
                      <span className={`
                        block text-[10px] text-muted-foreground tabular-nums
                      `}
                      >
                        {template.document.widthMm}
                        {' × '}
                        {template.document.heightMm}
                        {' mm'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
