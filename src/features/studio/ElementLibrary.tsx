'use client';

import type { ImageReadFailure } from './imageUpload';
import type { LabelDocument } from '@/utils/documentModel';
import { ImageIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { ADDABLE_TYPES, FIRST_PAGE_ID } from '@/utils/documentModel';
import { DocumentSvg } from './DocumentSvg';
import { readImageFile } from './imageUpload';
import { useAddElementLabels } from './useAddElementLabels';

/**
 * Compositions whose symbol set is worth offering as a starting point.
 *
 * One per tier of the KS K 0021 rules, so the four cards between them cover
 * every symbol the engine can produce. They are compositions rather than
 * pictures on purpose: the block stays live, so correcting the fabric text
 * later re-matches the symbols instead of leaving a stale drawing behind.
 */
const CARE_PRESETS: readonly { id: string; composition: string }[] = [
  { id: 'cotton', composition: '면 100%' },
  { id: 'polyester', composition: '폴리에스터 100%' },
  { id: 'rayon', composition: '레이온 100%' },
  { id: 'wool', composition: '울 100%' },
];

/** A preview document holding nothing but one care-symbol block. */
function previewDocument(composition: string): LabelDocument {
  return {
    templateId: `preview-${composition}`,
    widthMm: 27,
    heightMm: 6,
    pages: [
      {
        id: FIRST_PAGE_ID,
        elements: [
          {
            type: 'careSymbols',
            id: 'preview',
            labelKey: 'field_care_symbols',
            x: 0.5,
            y: 0.5,
            composition,
            glyphWidth: 5,
            gap: 0.4,
          },
        ],
      },
    ],
  };
}

const CARD_CLASS = `
  flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border
  border-border p-2 transition-colors
  hover:border-foreground/30 hover:bg-accent/60
`;

/**
 * What can be put on the page: an image from disk, a ready-made care-symbol
 * block, and the bare element types.
 *
 * The care presets draw with the same placeholder glyphs the canvas uses. They
 * are **not** certified KS artwork — the legal weight sits in the Korean
 * caption printed beside them, and a real print run needs the official symbol
 * set dropped in as an image.
 */
export const ElementLibrary = () => {
  const t = useTranslations('Studio');
  const addLabels = useAddElementLabels();
  const addElement = useDocumentStore(state => state.addElement);
  const addImage = useDocumentStore(state => state.addImage);
  const addCareSymbols = useDocumentStore(state => state.addCareSymbols);
  const doc = useDocumentStore(state => state.doc);
  const inputRef = useRef<HTMLInputElement>(null);
  const [failure, setFailure] = useState<ImageReadFailure | null>(null);

  const failureMessages: Record<ImageReadFailure, string> = {
    too_large: t('image_too_large'),
    not_an_image: t('image_not_an_image'),
    unreadable: t('image_unreadable'),
  };

  const handleFile = async (file: File) => {
    const result = await readImageFile(file);

    if (!result.ok) {
      setFailure(result.reason);

      return;
    }

    setFailure(null);
    // Dropped straight onto the middle of the page; a drop on the canvas
    // itself lands where it was released.
    addImage(result.src, { x: doc.widthMm / 4, y: doc.heightMm / 4 });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground">
          {t('library_image_heading')}
        </h3>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`
            flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg
            border border-dashed border-border px-3 py-4 text-xs
            text-muted-foreground transition-colors
            hover:border-foreground/40 hover:bg-accent/60 hover:text-foreground
          `}
        >
          <ImageIcon className="size-5" />
          {t('upload_image')}
          <span className="text-[10px]">{t('image_drop_hint')}</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            event.target.value = '';

            if (file) {
              void handleFile(file);
            }
          }}
        />

        {failure
          ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {failureMessages[failure]}
              </p>
            )
          : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground">
          {t('library_care_heading')}
        </h3>

        <ul className="grid grid-cols-2 gap-2">
          {CARE_PRESETS.map((preset) => {
            const preview = previewDocument(preset.composition);

            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => addCareSymbols(preset.composition)}
                  className={CARD_CLASS}
                >
                  <span className={`
                    flex w-full items-center justify-center overflow-hidden
                    rounded-md bg-white py-1.5 ring-1 ring-black/10
                  `}
                  >
                    <DocumentSvg doc={preview} width={100} height={22} />
                  </span>
                  <span className="block truncate text-[11px]">
                    {preset.composition}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-[10px] leading-snug text-muted-foreground">
          {t('care_placeholder_note')}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground">
          {t('add_heading')}
        </h3>

        <ul className="flex flex-wrap gap-1.5">
          {ADDABLE_TYPES.map(type => (
            <li key={type}>
              <button
                type="button"
                onClick={() => addElement(type)}
                className={`
                  cursor-pointer rounded-full border border-border px-2.5 py-1
                  text-xs text-muted-foreground transition-colors
                  hover:border-foreground/30 hover:bg-accent
                  hover:text-foreground
                `}
              >
                +
                {' '}
                {addLabels[type]}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
