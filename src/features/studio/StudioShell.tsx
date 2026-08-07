'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/utils/Helpers';
import { CanvasWorkspace } from './CanvasWorkspace';
import { ElementsPanel } from './ElementsPanel';
import { PagePropertiesBar } from './PagePropertiesBar';
import { TemplatePanel } from './TemplatePanel';

const PANEL_TABS = ['templates', 'elements'] as const;

type PanelTab = typeof PANEL_TABS[number];

/**
 * Editor shell: page properties across the top, the template and layer panels
 * pinned to the left edge, and the artwork filling everything left over.
 *
 * Page geometry moved out of a right-hand column and into the top bar because
 * it is set once and then left alone, while the canvas is where the work
 * happens — two columns of chrome around a 30mm label left the artwork smaller
 * than the panels beside it.
 */
export const StudioShell = () => {
  const t = useTranslations('Studio');
  const [tab, setTab] = useState<PanelTab>('templates');

  const tabLabels: Record<PanelTab, string> = {
    templates: t('tab_templates'),
    elements: t('tab_elements'),
  };

  return (
    /*
      The height fills what is left of the viewport under the navbar and page
      heading, so the artwork is on screen without scrolling. The floor keeps it
      usable on a short window, where scrolling is the lesser evil.
    */
    <div
      className={`
        flex h-[calc(100svh-11rem)] min-h-[560px] flex-col gap-2
        max-lg:h-auto
      `}
    >
      <PagePropertiesBar />

      <div
        className={`
          flex min-h-0 flex-1 gap-3
          max-lg:flex-col
        `}
      >
        {/*
          Left: template browser / layers. One bordered box with the tabs
          inside it, so it starts and ends on the same lines as the workspace
          beside it — the tab strip used to sit outside the border and push the
          panel down by its own height.
        */}
        <aside
          className={`
            flex w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border
            border-border
            max-lg:w-full
          `}
        >
          <div
            role="tablist"
            aria-label={t('templates_heading')}
            className={`
              flex shrink-0 gap-1 border-b border-border bg-secondary p-1
            `}
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

          <div
            className={`
              min-h-0 flex-1 overflow-y-auto p-3
              max-lg:max-h-[460px]
            `}
          >
            {tab === 'templates' ? <TemplatePanel /> : <ElementsPanel />}
          </div>
        </aside>

        {/* Centre: the artwork, taking every pixel the panels do not need */}
        <div
          className={`
            flex min-h-0 min-w-0 flex-1 flex-col
            max-lg:h-[560px]
          `}
        >
          <CanvasWorkspace />
        </div>
      </div>
    </div>
  );
};
