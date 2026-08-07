'use client';

import type { IconProps } from '@radix-ui/react-icons/dist/types';
import type { ComponentType } from 'react';
import { LayoutIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/utils/Helpers';
import { CanvasWorkspace } from './CanvasWorkspace';
import { ElementLibrary } from './ElementLibrary';
import { ElementsPanel } from './ElementsPanel';
import { PagePropertiesBar } from './PagePropertiesBar';
import { TemplatePanel } from './TemplatePanel';
import { TextFormatBar } from './TextFormatBar';

const PANEL_TABS = ['templates', 'elements'] as const;

type PanelTab = typeof PANEL_TABS[number];

const TAB_ICONS: Record<PanelTab, ComponentType<IconProps>> = {
  templates: LayoutIcon,
  elements: PlusCircledIcon,
};

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

      {/* Only present while a text element is selected — see TextFormatBar. */}
      <TextFormatBar />

      <div
        className={`
          flex min-h-0 flex-1 gap-3
          max-lg:flex-col
        `}
      >
        {/*
          Left: an icon rail choosing what the panel beside it shows.

          The rail is its own column rather than a strip inside the panel, so
          the panel is one bordered box that starts and ends on the same lines
          as the workspace — a tab strip above the border pushed the panel down
          by its own height and the two columns stopped lining up.
        */}
        <aside
          className={`
            flex shrink-0 gap-2
            max-lg:w-full
          `}
        >
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label={t('panel_rail_label')}
            className={`
              flex w-14 shrink-0 flex-col gap-1 overflow-hidden rounded-xl
              border border-border bg-secondary/60 p-1
            `}
          >
            {PANEL_TABS.map((item) => {
              const Icon = TAB_ICONS[item];

              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  title={tabLabels[item]}
                  onClick={() => setTab(item)}
                  className={cn(
                    `
                      flex cursor-pointer flex-col items-center gap-0.5
                      rounded-lg px-1 py-2 text-[10px] transition-colors
                    `,
                    tab === item
                      ? 'bg-background font-medium shadow-xs'
                      : `
                        text-muted-foreground
                        hover:bg-background/60 hover:text-foreground
                      `,
                  )}
                >
                  <Icon className="size-5" />
                  {tabLabels[item]}
                </button>
              );
            })}
          </div>

          <div
            className={`
              flex w-[268px] min-w-0 flex-col overflow-hidden rounded-xl border
              border-border
              max-lg:w-full
            `}
          >
            <div
              className={`
                min-h-0 flex-1 overflow-y-auto p-3
                max-lg:max-h-[460px]
              `}
            >
              {tab === 'templates'
                ? <TemplatePanel />
                : (
                    <div className="space-y-6">
                      <ElementLibrary />
                      <ElementsPanel />
                    </div>
                  )}
            </div>
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
