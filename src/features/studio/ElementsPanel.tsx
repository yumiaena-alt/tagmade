'use client';

import type { TextAlign } from '@/utils/documentModel';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CareSummary } from '@/features/label/CareSummary';
import { useDocumentStore } from '@/store/useDocumentStore';
import { buildCareGuide } from '@/utils/careRules';
import { elementContent } from '@/utils/documentModel';
import { parseFabricComposition } from '@/utils/fabricParser';
import { readImageFile } from './imageUpload';
import { useEditorFieldLabels } from './useEditorFieldLabels';

const CONTROL_CLASS = `
  w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm
  shadow-xs transition-colors outline-none
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
`;

const ALIGNMENTS: readonly TextAlign[] = ['left', 'center', 'right'];

/**
 * Shows what the composition resolves to: the matched tier, the five printed
 * captions, and the cautions. This is the FR-02 rule engine surfaced for the
 * selected care-symbol element.
 */
const CareSymbolsInspector = ({ composition }: { composition: string }) => {
  const parsed = parseFabricComposition(composition);

  return <CareSummary composition={parsed} careGuide={buildCareGuide(parsed)} />;
};

/**
 * Layer list and property inspector.
 *
 * Every element gets one labelled input here, so typing a brand or SKU on the
 * left still updates the canvas — and because both surfaces mutate the same
 * store, editing directly on the canvas updates these inputs too.
 */
export const ElementsPanel = () => {
  const t = useTranslations('Studio');
  const fieldLabels = useEditorFieldLabels();
  const [uploadError, setUploadError] = useState(false);
  const doc = useDocumentStore(state => state.doc);
  const selectedId = useDocumentStore(state => state.selectedId);
  const select = useDocumentStore(state => state.select);
  const setElementContent = useDocumentStore(state => state.setElementContent);
  const updateElement = useDocumentStore(state => state.updateElement);
  const removeElement = useDocumentStore(state => state.removeElement);

  const applyImageFile = async (elementId: string, file: File) => {
    const result = await readImageFile(file);

    setUploadError(!result.ok);

    if (result.ok) {
      updateElement(elementId, { src: result.src });
    }
  };

  const selected = doc.elements.find(element => element.id === selectedId);

  return (
    <div className="space-y-6">
      {/* Adding lives in the library above this panel — see ElementLibrary. */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium">{t('elements_heading')}</h2>

        {doc.elements.length === 0
          ? <p className="text-sm text-muted-foreground">{t('no_selection')}</p>
          : (
              <ul className="space-y-2">
                {doc.elements.map((element) => {
                  const content = elementContent(element);
                  const isSelected = element.id === selectedId;

                  return (
                    <li
                      key={element.id}
                      className={`
                        rounded-lg border p-2.5 transition-colors
                        ${isSelected
                      ? 'border-foreground bg-accent/50'
                      : `border-border`}
                      `}
                    >
                      <button
                        type="button"
                        onClick={() => select(element.id)}
                        className={`
                          mb-1.5 flex w-full cursor-pointer items-baseline
                          justify-between gap-2 text-left
                        `}
                      >
                        <span className="text-xs font-medium">
                          {fieldLabels[element.labelKey] ?? element.labelKey}
                        </span>
                        <span className={`
                          text-[10px] text-muted-foreground tabular-nums
                        `}
                        >
                          {Math.round(element.x)}
                          ,
                          {Math.round(element.y)}
                        </span>
                      </button>

                      {content === null
                        ? null
                        : element.type === 'text' && content.includes('\n')
                          ? (
                              <textarea
                                className={CONTROL_CLASS}
                                rows={2}
                                value={content}
                                onFocus={() => select(element.id)}
                                onChange={event =>
                                  setElementContent(element.id, event.target.value)}
                              />
                            )
                          : (
                              <input
                                className={CONTROL_CLASS}
                                value={content}
                                onFocus={() => select(element.id)}
                                onChange={event =>
                                  setElementContent(element.id, event.target.value)}
                              />
                            )}
                    </li>
                  );
                })}
              </ul>
            )}
      </section>

      {selected
        ? (
            <section className="space-y-2.5 rounded-lg border border-border p-3">
              <h2 className="text-sm font-medium">
                {fieldLabels[selected.labelKey] ?? selected.labelKey}
              </h2>

              {selected.type === 'image'
                ? (
                    <div className="space-y-2">
                      <input
                        type="file"
                        aria-label={t('upload_image')}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            void applyImageFile(selected.id, file);
                          }
                        }}
                        className={`
                          w-full cursor-pointer text-xs text-muted-foreground
                          file:mr-2 file:cursor-pointer file:rounded-md
                          file:border file:border-border file:bg-background
                          file:px-2.5 file:py-1 file:text-xs
                          file:text-foreground
                        `}
                      />
                      <p className="text-xs/relaxed text-muted-foreground">
                        {t('image_hint')}
                      </p>
                      {uploadError
                        ? (
                            <p
                              role="alert"
                              className="text-xs font-medium text-destructive"
                            >
                              {t('image_too_large')}
                            </p>
                          )
                        : null}
                    </div>
                  )
                : null}

              {selected.type === 'careSymbols'
                ? <CareSymbolsInspector composition={selected.composition} />
                : null}

              {selected.type === 'text'
                ? (
                    <div className="space-y-2.5">
                      <label className="block space-y-1">
                        <span className="text-xs text-muted-foreground">
                          {t('font_size')}
                        </span>
                        <input
                          type="number"
                          step={0.1}
                          min={0.8}
                          className={CONTROL_CLASS}
                          value={selected.fontSize}
                          onChange={event =>
                            updateElement(selected.id, {
                              fontSize: Number(event.target.value) || selected.fontSize,
                            })}
                        />
                      </label>

                      <span className="block text-xs text-muted-foreground">
                        {t('align')}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateElement(selected.id, { bold: !selected.bold })}
                          aria-pressed={Boolean(selected.bold)}
                          className={`
                            cursor-pointer rounded-md border px-2.5 py-1 text-xs
                            transition-colors
                            ${selected.bold
                      ? 'border-foreground bg-foreground text-background'
                      : `
                        border-border text-muted-foreground
                        hover:text-foreground
                      `}
                          `}
                        >
                          {t('bold')}
                        </button>

                        {ALIGNMENTS.map(align => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => updateElement(selected.id, { align })}
                            aria-pressed={(selected.align ?? 'left') === align}
                            className={`
                              cursor-pointer rounded-md border px-2.5 py-1
                              text-xs transition-colors
                              ${(selected.align ?? 'left') === align
                            ? 'border-foreground bg-foreground text-background'
                            : `
                              border-border text-muted-foreground
                              hover:text-foreground
                            `}
                            `}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                : null}

              <button
                type="button"
                onClick={() => removeElement(selected.id)}
                className={`
                  w-full cursor-pointer rounded-md border border-border px-2.5
                  py-1.5 text-xs text-muted-foreground transition-colors
                  hover:bg-destructive/10 hover:text-destructive
                `}
              >
                {t('delete_element')}
              </button>
            </section>
          )
        : null}
    </div>
  );
};
