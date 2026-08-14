'use client';

import type { DisplayUnit } from '@/store/useViewStore';
import { useTranslations } from 'next-intl';
import { useDocumentStore } from '@/store/useDocumentStore';
import {
  DISPLAY_UNITS,
  fromMm,
  GRID_STEPS_MM,
  toMm,
  useViewStore,
} from '@/store/useViewStore';
import { cn } from '@/utils/Helpers';
import { BarGroup, BarLabel, ColorField, CONTROL_CLASS } from './barControls';
import { DocumentIo } from './DocumentIo';
import { DocumentPdfButton } from './DocumentPdfButton';
import { DocumentPngButton } from './DocumentPngButton';

/** Label stock sizes an operator actually reaches for, in millimetres. */
const SIZE_PRESETS = [
  { id: 'care', widthMm: 30, heightMm: 70 },
  { id: 'tag', widthMm: 50, heightMm: 90 },
  { id: 'card', widthMm: 90, heightMm: 50 },
  { id: 'square', widthMm: 50, heightMm: 50 },
  { id: 'a6', widthMm: 105, heightMm: 148 },
] as const;

/**
 * Page geometry, display unit, size presets, background, rulers and export —
 * as a bar across the top of the studio.
 *
 * Centred rather than left-packed: with the export actions on their own row the
 * bar reads as one strip of settings, and the eye lands on the middle of the
 * canvas below it instead of being dragged to the left edge.
 *
 * Geometry is stored in millimetres throughout; the unit here is purely a
 * display choice, converted on the way in and out. That keeps print sizing exact
 * no matter which unit the operator prefers.
 */
export const PagePropertiesBar = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const resizePage = useDocumentStore(state => state.resizePage);
  const setBackground = useDocumentStore(state => state.setBackground);
  const setDocumentName = useDocumentStore(state => state.setDocumentName);
  const unit = useViewStore(state => state.unit);
  const setUnit = useViewStore(state => state.setUnit);
  const showRulers = useViewStore(state => state.showRulers);
  const toggleRulers = useViewStore(state => state.toggleRulers);
  const gridStepMm = useViewStore(state => state.gridStepMm);
  const snapToGrid = useViewStore(state => state.snapToGrid);
  const setGridStep = useViewStore(state => state.setGridStep);
  const toggleGridSnap = useViewStore(state => state.toggleGridSnap);
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
        flex shrink-0 flex-col items-center gap-2 rounded-xl border
        border-border bg-background px-3 py-2
      `}
    >
      {/*
        The document's own name, which the recorder fills in on the first edit
        and the operator can then rewrite. Wider and heavier than the settings
        below it, because it is the one field that names the whole thing.
      */}
      <input
        value={doc.name ?? ''}
        placeholder={t('untitled_document')}
        aria-label={t('document_name')}
        onChange={event => setDocumentName(event.target.value)}
        className={`
          w-full max-w-sm rounded-md border border-transparent bg-transparent
          px-2 py-1 text-center text-sm font-semibold transition-colors
          outline-none
          hover:border-input
          focus-visible:border-ring focus-visible:ring-[3px]
          focus-visible:ring-ring/50
        `}
      />

      <div className="
        flex flex-wrap items-center justify-center gap-x-5 gap-y-2
      "
      >
        <BarGroup>
          <label className="flex items-center gap-1.5">
            <BarLabel>{t('width_label')}</BarLabel>
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
            <BarLabel>{t('height_label')}</BarLabel>
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

          <div className="flex gap-0.5 rounded-lg bg-secondary p-0.5">
            {DISPLAY_UNITS.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setUnit(item)}
                aria-pressed={unit === item}
                className={cn(
                  `
                    cursor-pointer rounded-md px-2 py-1 text-xs
                    transition-colors
                  `,
                  unit === item
                    ? 'bg-background font-semibold shadow-xs'
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
        </BarGroup>

        <BarGroup>
          <BarLabel>{t('presets_label')}</BarLabel>
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
                        cursor-pointer rounded-md border px-2 py-1 text-xs
                        tabular-nums transition-colors
                      `,
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : `
                          border-border text-muted-foreground
                          hover:border-foreground/30 hover:text-foreground
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
        </BarGroup>

        <BarGroup>
          <ColorField
            label={t('background_color')}
            value={doc.backgroundColor ?? '#ffffff'}
            onChange={setBackground}
          />

          <label className={`
            flex cursor-pointer items-center gap-1.5 text-xs
            text-muted-foreground
          `}
          >
            <input
              type="checkbox"
              checked={showRulers}
              onChange={toggleRulers}
              className="cursor-pointer"
            />
            {t('rulers_label')}
          </label>
        </BarGroup>

        <BarGroup>
          <label className={`
            flex cursor-pointer items-center gap-1.5 text-xs
            text-muted-foreground
          `}
          >
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={toggleGridSnap}
              className="cursor-pointer"
            />
            {t('grid_snap_label')}
          </label>

          <select
            value={gridStepMm}
            onChange={event => setGridStep(Number(event.target.value))}
            disabled={!snapToGrid}
            aria-label={t('grid_step_label')}
            title={t('grid_step_label')}
            className={cn(
              CONTROL_CLASS,
              'w-16',
              snapToGrid ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
            )}
          >
            {GRID_STEPS_MM.map(step => (
              <option key={step} value={step}>
                {step}
                mm
              </option>
            ))}
          </select>
        </BarGroup>
      </div>

      <div className={`
        flex w-full flex-wrap items-center justify-center gap-3 border-t
        border-border pt-2
      `}
      >
        <DocumentIo />
        <DocumentPngButton />
        <DocumentPdfButton doc={doc} documentName={doc.templateId} />
      </div>
    </div>
  );
};
