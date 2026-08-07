'use client';

import type { SaveFailure } from '@/store/useUserTemplateStore';
import { TrashIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { useUserTemplateStore } from '@/store/useUserTemplateStore';
import { DocumentSvg } from './DocumentSvg';
import { thumbSize } from './templateThumb';

/**
 * The operator's own templates: save the open document under a name, then bring
 * it back later.
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
  const saveTemplate = useUserTemplateStore(state => state.saveTemplate);
  const removeTemplate = useUserTemplateStore(state => state.removeTemplate);
  const [name, setName] = useState('');
  const [failure, setFailure] = useState<SaveFailure | null>(null);

  const failureMessages: Record<SaveFailure, string> = {
    empty_name: t('my_template_name_required'),
    too_large: t('my_template_too_large'),
  };

  const handleSave = () => {
    const result = saveTemplate(name, doc);

    setFailure(result.ok ? null : result.reason);

    if (result.ok) {
      setName('');
    }
  };

  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground">
        {t('my_templates_heading')}
      </h3>

      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSave();
            }
          }}
          placeholder={t('my_template_name_placeholder')}
          aria-label={t('my_template_name_placeholder')}
          className={`
            min-w-0 flex-1 rounded-md border border-input bg-background px-2
            py-1 text-xs shadow-xs transition-colors outline-none
            focus-visible:border-ring focus-visible:ring-[3px]
            focus-visible:ring-ring/50
          `}
        />
        <button
          type="button"
          onClick={handleSave}
          className={`
            shrink-0 cursor-pointer rounded-md border border-border px-2 py-1
            text-xs transition-colors
            hover:border-foreground/30 hover:bg-accent
          `}
        >
          {t('save_my_template')}
        </button>
      </div>

      {failure
        ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {failureMessages[failure]}
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

                return (
                  <li key={template.id} className="relative">
                    <button
                      type="button"
                      onClick={() => loadDocument(template.document)}
                      className={`
                        flex w-full cursor-pointer flex-col items-center gap-1.5
                        rounded-lg border border-border p-2 transition-colors
                        hover:border-foreground/30 hover:bg-accent/60
                      `}
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
