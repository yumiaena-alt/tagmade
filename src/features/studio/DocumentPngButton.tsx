'use client';

import { DownloadIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { PX_PER_MM, useViewStore } from '@/store/useViewStore';
import { exportFileName } from '@/utils/exportFileName';
import { exportStagePng, nextCanvasPaint } from './canvasStage';

/**
 * Downloads the document as 300dpi PNGs, one per page.
 *
 * The vector PDF stays the output to send a printer; this is for the places a
 * bitmap is what fits — a supplier chat, a listing image, a slide.
 *
 * Every page is captured from the live canvas one at a time, because the canvas
 * only ever draws the page being edited and it is the only surface with the
 * webfonts loaded and measured. So the export walks the pages, waits for each to
 * be drawn, captures it, and puts the operator back where they were. Until this
 * existed a multi-page document exported its first page and silently dropped
 * the rest.
 */
export const DocumentPngButton = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const activePageIndex = useDocumentStore(state => state.activePageIndex);
  const selectPage = useDocumentStore(state => state.selectPage);
  const selectedId = useDocumentStore(state => state.selectedId);
  const select = useDocumentStore(state => state.select);
  const zoom = useViewStore(state => state.zoom);
  const [hasError, setHasError] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  const pageCount = doc.pages.length;
  const isMultiPage = pageCount > 1;

  const save = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');

    link.href = dataUrl;
    link.download = fileName;
    link.click();
  };

  const handleDownload = async () => {
    const base = doc.name?.trim() || doc.templateId;
    const startedOn = activePageIndex;
    const hadSelected = selectedId;

    setIsBuilding(true);
    setHasError(false);

    try {
      for (let index = 0; index < pageCount; index += 1) {
        // Switch every time, including back to the page this started on. An
        // earlier version skipped that one as an optimisation and captured
        // whichever page the loop had left on screen instead — two files with
        // different names and identical bytes.
        if (isMultiPage) {
          selectPage(index);
          await nextCanvasPaint();
        }

        const shot = exportStagePng(PX_PER_MM * zoom);

        if (!shot) {
          setHasError(true);

          return;
        }

        save(
          shot.dataUrl,
          exportFileName(
            base,
            'png',
            isMultiPage
              ? { number: index + 1, name: doc.pages[index]?.name }
              : undefined,
          ),
        );
      }
    } finally {
      if (isMultiPage) {
        // Back to the page being edited, with what was selected on it —
        // switching pages clears the selection.
        selectPage(startedOn);
        select(hadSelected);
      }

      setIsBuilding(false);
    }
  };

  const hint = isMultiPage
    ? t('png_hint_all', { count: pageCount })
    : t('png_hint');

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isBuilding}
        title={hint}
        className={`
          flex cursor-pointer items-center gap-1.5 rounded-md border
          border-border px-2.5 py-1.5 text-xs font-medium transition-colors
          hover:border-foreground/30 hover:bg-accent
          disabled:cursor-not-allowed disabled:opacity-60
        `}
      >
        <DownloadIcon className="size-3.5" />
        {isBuilding ? t('png_building') : t('png_download')}
      </button>

      {hasError
        ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {t('png_error')}
            </p>
          )
        : null}
    </div>
  );
};
