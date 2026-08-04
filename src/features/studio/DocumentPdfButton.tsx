'use client';

import type { LabelDocument } from '@/utils/documentModel';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { cn } from '@/utils/Helpers';
import { DocumentPdf } from './DocumentPdf';

type DocumentPdfButtonProps = {
  doc: LabelDocument;
  /** Used for the filename and the PDF's title metadata. */
  documentName: string;
};

function toFileName(name: string): string {
  const safe = name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');

  return `${safe || 'label'}.pdf`;
}

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
      link.download = toFileName(documentName);
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setHasError(true);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isBuilding}
        className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
      >
        {isBuilding ? t('pdf_building') : t('pdf_download')}
      </button>

      <p className="text-xs text-muted-foreground">
        {t('pdf_hint', { width: doc.widthMm, height: doc.heightMm })}
      </p>

      {hasError
        ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {t('pdf_error')}
            </p>
          )
        : null}
    </div>
  );
};
