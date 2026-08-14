'use client';

import type { LabelDocument } from '@/utils/documentModel';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { exportFileName } from '@/utils/exportFileName';
import { cn } from '@/utils/Helpers';
import { DocumentPdf } from './DocumentPdf';

type DocumentPdfButtonProps = {
  doc: LabelDocument;
  /** Used for the filename and the PDF's title metadata. */
  documentName: string;
};

/**
 * Builds the vector PDF in the browser and downloads it.
 * `@react-pdf/renderer` is imported on demand so it stays out of the page bundle.
 */
export const DocumentPdfButton = ({
  doc,
  documentName,
}: DocumentPdfButtonProps) => {
  const t = useTranslations('Studio');
  const [isBuilding, setIsBuilding] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleDownload = async () => {
    setIsBuilding(true);
    setHasError(false);

    try {
      const { pdf } = await import('@react-pdf/renderer');

      const blob = await pdf(
        <DocumentPdf doc={doc} title={documentName} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = exportFileName(documentName, 'pdf');
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setHasError(true);
    } finally {
      setIsBuilding(false);
    }
  };

  const hint = t('pdf_hint', { width: doc.widthMm, height: doc.heightMm });

  return (
    <div className="flex items-center gap-2">
      {/*
        The size hint is the one thing worth double-checking before a print run,
        so it stays visible where there is room and falls back to the button's
        tooltip once the bar gets tight.
      */}
      <p className="
        max-w-56 text-[11px] leading-snug text-muted-foreground
        max-2xl:hidden
      "
      >
        {hint}
      </p>

      {hasError
        ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {t('pdf_error')}
            </p>
          )
        : null}

      <button
        type="button"
        onClick={handleDownload}
        disabled={isBuilding}
        title={hint}
        className={cn(buttonVariants(), 'shrink-0')}
      >
        {isBuilding ? t('pdf_building') : t('pdf_download')}
      </button>
    </div>
  );
};
