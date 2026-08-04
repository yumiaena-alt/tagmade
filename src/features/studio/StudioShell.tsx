'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { cn } from '@/utils/Helpers';
import { DocumentCanvas } from './DocumentCanvas';
import { DocumentPdfButton } from './DocumentPdfButton';
import { ElementsPanel } from './ElementsPanel';
import { TemplatePanel } from './TemplatePanel';

const PANEL_TABS = ['templates', 'elements'] as const;

type PanelTab = typeof PANEL_TABS[number];

/** Canvas viewport the artwork is scaled to fit, in CSS pixels. */
const VIEWPORT = { width: 620, height: 560 };

/** Fits the page inside the viewport without ever upscaling past 14px/mm. */
function fitScale(widthMm: number, heightMm: number): number {
  const raw = Math.min(
    VIEWPORT.width / widthMm,
    VIEWPORT.height / heightMm,
  );

  return Math.max(3, Math.min(14, raw));
}

/**
 * Studio layout: template browser on the left, artwork centred in a workspace.
 *
 * Both panels and the canvas read and write one document store, so a value typed
 * in the left panel and a drag on the canvas are the same edit.
 */
export const StudioShell = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const [tab, setTab] = useState<PanelTab>('templates');

  const tabLabels: Record<PanelTab, string> = {
    templates: t('tab_templates'),
    elements: t('tab_elements'),
  };

  const scale = useMemo(
    () => fitScale(doc.widthMm, doc.heightMm),
    [doc.widthMm, doc.heightMm],
  );

  return (
    <div className={`
      grid gap-6
      lg:grid-cols-[320px_minmax(0,1fr)]
    `}
    >
      {/* Left: template browser / layer inspector */}
      <aside className="space-y-4">
        <div
          role="tablist"
          aria-label={t('templates_heading')}
          className="flex gap-1 rounded-lg bg-secondary p-1"
        >
          {PANEL_TABS.map(item => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={cn(
                `
                  flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm
                  transition-colors
                `,
                tab === item
                  ? 'bg-background font-medium shadow-xs'
                  : `
                    text-muted-foreground
                    hover:text-foreground
                  `,
              )}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>

        <div className={`
          max-h-[560px] overflow-y-auto pr-1
          lg:max-h-[620px]
        `}
        >
          {tab === 'templates' ? <TemplatePanel /> : <ElementsPanel />}
        </div>
      </aside>

      {/* Centre: the artwork on a workspace surface */}
      <div className="space-y-3">
        <div className={`
          flex min-h-[560px] items-center justify-center overflow-auto
          rounded-2xl bg-muted/60 p-8
        `}
        >
          <div className="shadow-xl shadow-black/10">
            <DocumentCanvas scale={scale} />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {doc.widthMm}
          {' × '}
          {doc.heightMm}
          {' mm · '}
          {t('canvas_hint')}
        </p>

        <div className="mx-auto max-w-sm">
          <DocumentPdfButton
            doc={doc}
            documentName={doc.templateId}
          />
        </div>
      </div>
    </div>
  );
};
