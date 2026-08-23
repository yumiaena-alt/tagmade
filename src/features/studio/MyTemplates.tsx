'use client';

import type { SaveFailure, UserTemplate } from '@/store/useUserTemplateStore';
import { DownloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { useFormatter, useTranslations } from 'next-intl';
import { useDocumentStore } from '@/store/useDocumentStore';
import { useUserTemplateStore } from '@/store/useUserTemplateStore';
import { documentFileName, serializeDocument } from '@/utils/documentFile';
import { cn } from '@/utils/Helpers';
import { DocumentSvg } from './DocumentSvg';
import { downloadBlob } from './downloadBlob';
import { thumbSize } from './templateThumb';

const OVERLAY_BUTTON_CLASS = `
  cursor-pointer rounded-md bg-background/90 p-1 text-muted-foreground
  transition-colors
`;

/**
 * The operator's own templates.
 *
 * Nothing is saved by hand: `AutoTemplateRecorder` forks a built-in template
 * into an entry here on the first edit and updates it from then on, so this is
 * a list of work already kept rather than a thing to remember to do.
 *
 * Sits above the built-in gallery because it is the shorter, more relevant
 * list — a shop reuses its own three layouts far more often than it goes
 * shopping through eighteen starting points.
 *
 * Every entry can be downloaded from here without being opened first. What is
 * kept on the machine is only as safe as the machine, and somebody coming back
 * for last season's label wants the file, not an editing session — making them
 * load the document onto the canvas just to reach the save button put an
 * accidental edit between them and their own work.
 */
export const MyTemplates = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const loadDocument = useDocumentStore(state => state.loadDocument);
  const templates = useUserTemplateStore(state => state.templates);
  const removeTemplate = useUserTemplateStore(state => state.removeTemplate);
  const lastFailure = useUserTemplateStore(state => state.lastFailure);
  const format = useFormatter();

  const handleDownload = (template: UserTemplate) => {
    const blob = new Blob([serializeDocument(template.document)], {
      type: 'application/json',
    });

    downloadBlob(blob, documentFileName(template.document));
  };

  const failureMessages: Record<SaveFailure, string> = {
    empty_name: t('my_template_name_required'),
    too_large: t('my_template_too_large'),
  };

  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground">
        {t('my_templates_heading')}
      </h3>

      <p className="text-[11px] text-muted-foreground">
        {t('my_templates_auto_note')}
      </p>

      {lastFailure
        ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {failureMessages[lastFailure]}
            </p>
          )
        : null}

      {templates.length === 0
        ? (
            <p className="text-[11px] text-muted-foreground">
              {t('my_templates_empty')}
            </p>
          )
        : (
            <ul className="grid grid-cols-2 gap-2.5">
              {templates.map((template) => {
                const size = thumbSize(
                  template.document.widthMm,
                  template.document.heightMm,
                );

                const isOpen = template.id === doc.templateId;

                return (
                  <li key={template.id} className="relative">
                    <button
                      type="button"
                      onClick={() => loadDocument(template.document)}
                      aria-pressed={isOpen}
                      className={cn(
                        `
                          flex w-full cursor-pointer flex-col items-center
                          gap-1.5 rounded-lg border p-2 transition-colors
                        `,
                        isOpen
                          ? 'border-foreground bg-accent'
                          : `
                            border-border
                            hover:border-foreground/30 hover:bg-accent/60
                          `,
                      )}
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
                          {template.name}
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
                        {/*
                          The timestamp is the evidence that recording is
                          actually happening — without it "saves by itself" is
                          something the operator has to take on faith.
                        */}
                        <span className={`
                          block text-[10px] text-muted-foreground
                        `}
                        >
                          {t('my_template_saved_at', {
                            at: format.dateTime(new Date(template.savedAt), {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }),
                          })}
                        </span>
                      </span>
                    </button>

                    {/*
                      Overlaid rather than placed in the card, so the card stays
                      one button — nesting a button inside a button is invalid
                      and swallows the click.
                    */}
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownload(template)}
                        aria-label={t('download_my_template', { name: template.name })}
                        title={t('download_my_template', { name: template.name })}
                        className={cn(
                          OVERLAY_BUTTON_CLASS,
                          'hover:bg-accent hover:text-foreground',
                        )}
                      >
                        <DownloadIcon className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeTemplate(template.id)}
                        aria-label={t('delete_my_template', { name: template.name })}
                        title={t('delete_my_template', { name: template.name })}
                        className={cn(
                          OVERLAY_BUTTON_CLASS,
                          'hover:bg-destructive/10 hover:text-destructive',
                        )}
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
    </section>
  );
};
