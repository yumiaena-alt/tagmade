'use client';

import type { ParseFailure } from '@/utils/documentFile';
import { DownloadIcon, UploadIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import {
  documentFileName,
  parseDocument,
  serializeDocument,
} from '@/utils/documentFile';

const BUTTON_CLASS = `
  flex cursor-pointer items-center gap-1 rounded-md border border-border px-2
  py-1 text-xs text-muted-foreground transition-colors
  hover:border-foreground/30 hover:bg-accent hover:text-foreground
`;

/**
 * Saves the open document to a `.json` file and opens one back up.
 *
 * This is the only way work survives a cleared browser or a change of machine —
 * the store persists to `localStorage` and nothing else.
 */
export const DocumentIo = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const loadDocument = useDocumentStore(state => state.loadDocument);
  const inputRef = useRef<HTMLInputElement>(null);
  const [failure, setFailure] = useState<ParseFailure | null>(null);

  const failureMessages: Record<ParseFailure, string> = {
    invalid_json: t('import_error_invalid'),
    not_a_document: t('import_error_shape'),
    unsupported_version: t('import_error_version'),
  };

  const handleExport = () => {
    const blob = new Blob([serializeDocument(doc)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = documentFileName(doc);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const result = parseDocument(await file.text());

    if (!result.ok) {
      setFailure(result.reason);

      return;
    }

    setFailure(null);
    loadDocument(result.doc);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleExport}
        title={t('export_document')}
        className={BUTTON_CLASS}
      >
        <DownloadIcon className="size-3.5" />
        {t('export_document')}
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={t('import_document')}
        className={BUTTON_CLASS}
      >
        <UploadIcon className="size-3.5" />
        {t('import_document')}
      </button>

      {/*
        Reset after every pick, so choosing the same file twice in a row still
        fires a change event — otherwise a failed import cannot be retried.
      */}
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
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
    </div>
  );
};
