'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/utils/Helpers';
import { CanvasWorkspace } from './CanvasWorkspace';
import { ElementsPanel } from './ElementsPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplatePanel } from './TemplatePanel';

const PANEL_TABS = ['templates', 'elements'] as const;

type PanelTab = typeof PANEL_TABS[number];

/**
 * Editor shell: template and layer panels on the left, the artwork workspace in
 * the middle, page properties and export on the right.
 *
 * Three independent columns rather than one grid of content, so each can grow
 * without disturbing the others — a page list, an asset browser or a mock-up
 * view can be added to a column later without touching the canvas.
 */
export const StudioShell = () => {
  const t = useTranslations('Studio');
  const [tab, setTab] = useState<PanelTab>('templates');

  const tabLabels: Record<PanelTab, string> = {
    templates: t('tab_templates'),
    elements: t('tab_elements'),
  };

  return (
    <div
      className={`
        flex h-[78vh] min-h-[560px] gap-4
        max-lg:h-auto max-lg:flex-col
      `}
    >
      {/* Left: template browser / layers */}
      <aside
        className={`
          flex w-[300px] shrink-0 flex-col gap-3
          max-lg:w-full
        `}
      >
        <div
          role="tablist"
          aria-label={t('templates_heading')}
          className="flex shrink-0 gap-1 rounded-lg bg-secondary p-1"
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
            min-h-0 flex-1 overflow-y-auto rounded-xl border border-border p-3
            max-lg:max-h-[460px]
          `}
        >
          {tab === 'templates' ? <TemplatePanel /> : <ElementsPanel />}
        </div>
      </aside>

      {/* Centre: the artwork */}
      <div className="
        flex min-h-0 min-w-0 flex-1 flex-col gap-2
        max-lg:h-[560px]
      "
      >
        <CanvasWorkspace />
        <p className="shrink-0 text-center text-xs text-muted-foreground">
          {t('canvas_hint')}
        </p>
      </div>

      {/* Right: page properties and export */}
      <aside
        className={`
          w-[260px] shrink-0 overflow-y-auto rounded-xl border border-border p-3
          max-lg:w-full
        `}
      >
        <PropertiesPanel />
      </aside>
    </div>
  );
};
