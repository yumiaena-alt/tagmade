'use client';

import type { DisplayUnit } from '@/store/useViewStore';
import { useTranslations } from 'next-intl';
import { useDocumentStore } from '@/store/useDocumentStore';
import {
  DISPLAY_UNITS,
  fromMm,
  toMm,
  useViewStore,
} from '@/store/useViewStore';
import { cn } from '@/utils/Helpers';
import { DocumentPdfButton } from './DocumentPdfButton';

const CONTROL_CLASS = `
  w-16 rounded-md border border-input bg-background px-2 py-1 text-sm
  tabular-nums shadow-xs transition-colors outline-none
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
`;

/** Label stock sizes an operator actually reaches for, in millimetres. */
const SIZE_PRESETS = [
  { id: 'care', widthMm: 30, heightMm: 70 },
  { id: 'tag', widthMm: 50, heightMm: 90 },
  { id: 'card', widthMm: 90, heightMm: 50 },
  { id: 'square', widthMm: 50, heightMm: 50 },
  { id: 'a6', widthMm: 105, heightMm: 148 },
] as const;

/**
 * Page geometry, display unit, size presets, rulers and export — as a bar
 * across the top of the studio.
 *
 * These are document-wide settings touched occasionally, so they no longer
 * deserve a permanent column beside the artwork; moving them up here hands that
 * width back to the canvas, which is the surface the operator actually works in.
 *
 * Geometry is stored in millimetres throughout; the unit here is purely a
 * display choice, converted on the way in and out. That keeps print sizing exact
 * no matter which unit the operator prefers.
 */
export const PagePropertiesBar = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const resizePage = useDocumentStore(state => state.resizePage);
  const unit = useViewStore(state => state.unit);
  const setUnit = useViewStore(state => state.setUnit);
  const showRulers = useViewStore(state => state.showRulers);
  const toggleRulers = useViewStore(state => state.toggleRulers);
  const requestFit = useViewStore(state => state.requestFit);

  const unitLabels: Record<DisplayUnit, string> = {
    mm: 'mm',
    px: 'px',
    inch: 'inch',
  };

  const applySize = (widthMm: number, heightMm: number) => {
    resizePage(widthMm, heightMm);
    requestFit();
  };

  return (
    <div
      aria-label={t('page_props_heading')}
      className={`
        flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border
        border-border bg-background px-3 py-2
      `}
    >
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t('width_label')}
          </span>
          <input
            type="number"
            className={CONTROL_CLASS}
            value={fromMm(doc.widthMm, unit)}
            min={1}
            step={unit === 'inch' ? 0.1 : 1}
            onChange={event =>
              applySize(
                toMm(Number(event.target.value) || 0, unit) || doc.widthMm,
                doc.heightMm,
              )}
          />
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t('height_label')}
          </span>
          <input
            type="number"
            className={CONTROL_CLASS}
            value={fromMm(doc.heightMm, unit)}
            min={1}
            step={unit === 'inch' ? 0.1 : 1}
            onChange={event =>
              applySize(
                doc.widthMm,
                toMm(Number(event.target.value) || 0, unit) || doc.heightMm,
              )}
          />
        </label>
      </div>

      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {DISPLAY_UNITS.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setUnit(item)}
            aria-pressed={unit === item}
            className={cn(
              'cursor-pointer rounded-md px-2 py-0.5 text-xs transition-colors',
              unit === item
                ? 'bg-background font-medium shadow-xs'
                : `
                  text-muted-foreground
                  hover:text-foreground
                `,
            )}
          >
            {unitLabels[item]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">
          {t('presets_label')}
        </span>
        <ul className="flex flex-wrap gap-1">
          {SIZE_PRESETS.map((preset) => {
            const isActive
              = Math.abs(doc.widthMm - preset.widthMm) < 0.01
                && Math.abs(doc.heightMm - preset.heightMm) < 0.01;

            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => applySize(preset.widthMm, preset.heightMm)}
                  aria-pressed={isActive}
                  className={cn(
                    `
                      cursor-pointer rounded-md border px-2 py-0.5 text-[11px]
                      tabular-nums transition-colors
                    `,
                    isActive
                      ? 'border-foreground bg-foreground text-background'
                      : `
                        border-border text-muted-foreground
                        hover:text-foreground
                      `,
                  )}
                >
                  {preset.widthMm}
                  ×
                  {preset.heightMm}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={showRulers}
          onChange={toggleRulers}
          className="cursor-pointer"
        />
        {t('rulers_label')}
      </label>

      <div className="
        ml-auto
        max-lg:ml-0 max-lg:w-full
      "
      >
        <DocumentPdfButton doc={doc} documentName={doc.templateId} />
      </div>
    </div>
  );
};
