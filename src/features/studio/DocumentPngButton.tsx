'use client';

import { DownloadIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { PX_PER_MM, useViewStore } from '@/store/useViewStore';
import { exportStagePng } from './canvasStage';

function toFileName(name: string): string {
  const safe = name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');

  return `${safe || 'label'}.png`;
}

/**
 * Downloads the canvas as a 300dpi PNG.
 *
 * The vector PDF stays the output to send a printer; this is for the places a
 * bitmap is what fits — a supplier chat, a listing image, a slide.
 */
export const DocumentPngButton = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const zoom = useViewStore(state => state.zoom);
  const [hasError, setHasError] = useState(false);

  const handleDownload = () => {
    const result = exportStagePng(PX_PER_MM * zoom);

    if (!result) {
      setHasError(true);

      return;
    }

    setHasError(false);

    const link = document.createElement('a');

    link.href = result.dataUrl;
    link.download = toFileName(doc.templateId);
    link.click();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDownload}
        title={t('png_hint')}
        className={`
          flex cursor-pointer items-center gap-1.5 rounded-md border
          border-border px-2.5 py-1.5 text-xs font-medium transition-colors
          hover:border-foreground/30 hover:bg-accent
        `}
      >
        <DownloadIcon className="size-3.5" />
        {t('png_download')}
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
