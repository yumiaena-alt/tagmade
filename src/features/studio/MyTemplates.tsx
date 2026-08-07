'use client';

import type { SaveFailure } from '@/store/useUserTemplateStore';
import { TrashIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useDocumentStore } from '@/store/useDocumentStore';
import { useUserTemplateStore } from '@/store/useUserTemplateStore';
import { cn } from '@/utils/Helpers';
import { DocumentSvg } from './DocumentSvg';
import { thumbSize } from './templateThumb';

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
 */
export const MyTemplates = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const loadDocument = useDocumentStore(state => state.loadDocument);
  const templates = useUserTemplateStore(state => state.templates);
  const removeTemplate = useUserTemplateStore(state => state.removeTemplate);
  const lastFailure = useUserTemplateStore(state => state.lastFailure);

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
                      </span>
                    </button>

                    {/*
                      Overlaid rather than placed in the card, so the card stays
                      one button — nesting a button inside a button is invalid
                      and swallows the click.
                    */}
                    <button
                      type="button"
                      onClick={() => removeTemplate(template.id)}
                      aria-label={t('delete_my_template', { name: template.name })}
                      title={t('delete_my_template', { name: template.name })}
                      className={`
                        absolute top-1 right-1 cursor-pointer rounded-md
                        bg-background/90 p-1 text-muted-foreground
                        transition-colors
                        hover:bg-destructive/10 hover:text-destructive
                      `}
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
    </section>
  );
};
