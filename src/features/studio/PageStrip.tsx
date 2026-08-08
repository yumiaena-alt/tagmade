'use client';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useDocumentStore } from '@/store/useDocumentStore';
import { cn } from '@/utils/Helpers';
import { DocumentSvg } from './DocumentSvg';

/** Thumbnail height in the strip; width follows the page ratio. */
const THUMB_HEIGHT = 34;
const THUMB_MAX_WIDTH = 64;
const THUMB_MIN_WIDTH = 14;

function thumbSize(widthMm: number, heightMm: number): {
  width: number;
  height: number;
} {
  const width = Math.round(THUMB_HEIGHT * (widthMm / heightMm));

  return {
    width: Math.min(THUMB_MAX_WIDTH, Math.max(THUMB_MIN_WIDTH, width)),
    height: THUMB_HEIGHT,
  };
}

const ACTION_CLASS = `
  rounded-md p-1.5 transition-colors
  disabled:cursor-not-allowed disabled:text-muted-foreground/40
`;

const ENABLED_CLASS = `
  cursor-pointer
  hover:bg-accent
`;

/**
 * The document's pages, as a strip under the canvas.
 *
 * Always visible, even for a one-page document: adding a page is not something
 * an operator goes looking for in a menu, and a strip that appears only once
 * you already have two pages can never teach you how to get the second.
 *
 * The per-page actions sit in a fixed group on the right rather than on the
 * selected card, so the row does not change height as the selection moves.
 */
export const PageStrip = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const activePageIndex = useDocumentStore(state => state.activePageIndex);
  const selectPage = useDocumentStore(state => state.selectPage);
  const addPage = useDocumentStore(state => state.addPage);
  const duplicatePage = useDocumentStore(state => state.duplicatePage);
  const removePage = useDocumentStore(state => state.removePage);
  const movePage = useDocumentStore(state => state.movePage);
  const setPageName = useDocumentStore(state => state.setPageName);

  const size = thumbSize(doc.widthMm, doc.heightMm);
  const isOnlyPage = doc.pages.length < 2;

  return (
    <div
      className={`
        flex shrink-0 items-center gap-3 border-t border-border bg-background/70
        px-2 py-1.5
      `}
    >
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {t('pages_label')}
      </span>

      <ul
        aria-label={t('pages_label')}
        className="flex min-w-0 flex-1 items-end gap-1.5 overflow-x-auto"
      >
        {doc.pages.map((page, index) => {
          const isActive = index === activePageIndex;
          // A named page answers to its name; an unnamed one to its number.
          const named = page.name?.trim() ?? '';
          const caption = named || String(index + 1);
          const label = named
            ? `${t('page_number', { n: index + 1 })} · ${named}`
            : t('page_number', { n: index + 1 });

          return (
            <li key={page.id} className="shrink-0">
              <button
                type="button"
                onClick={() => selectPage(index)}
                aria-current={isActive}
                aria-label={label}
                title={label}
                className={cn(
                  `
                    flex cursor-pointer flex-col items-center gap-0.5 rounded-md
                    border p-1 transition-colors
                  `,
                  isActive
                    ? 'border-foreground bg-accent/60'
                    : `
                      border-border
                      hover:border-foreground/30 hover:bg-accent/40
                    `,
                )}
              >
                <DocumentSvg
                  doc={doc}
                  pageIndex={index}
                  width={size.width}
                  height={size.height}
                  className="rounded-xs border border-border/70"
                />
                <span
                  className={cn(
                    'block max-w-16 truncate text-[10px]',
                    named ? '' : 'tabular-nums',
                    isActive ? 'font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {caption}
                </span>
              </button>
            </li>
          );
        })}

        <li className="shrink-0">
          <button
            type="button"
            onClick={addPage}
            aria-label={t('add_page')}
            title={t('add_page')}
            className={`
              flex cursor-pointer items-center justify-center rounded-md border
              border-dashed border-border text-muted-foreground
              transition-colors
              hover:border-foreground/40 hover:bg-accent/40
              hover:text-foreground
            `}
            style={{ width: size.width + 8, height: size.height + 8 }}
          >
            <PlusIcon className="size-4" />
          </button>
        </li>
      </ul>

      <div className="flex shrink-0 items-center gap-1">
        {/*
          One field for the page being looked at, rather than an input inside
          every card: a thumbnail is as narrow as its page, and a 14px-wide box
          is not something a name can be typed into.
        */}
        <input
          value={doc.pages[activePageIndex]?.name ?? ''}
          onChange={event => setPageName(activePageIndex, event.target.value)}
          placeholder={t('page_number', { n: activePageIndex + 1 })}
          aria-label={t('page_name')}
          title={t('page_name')}
          className={`
            w-24 rounded-md border border-input bg-background px-2 py-1 text-xs
            shadow-xs transition-colors outline-none
            focus-visible:border-ring focus-visible:ring-[3px]
            focus-visible:ring-ring/50
          `}
        />

        <button
          type="button"
          onClick={() => movePage(activePageIndex, 'backward')}
          disabled={activePageIndex === 0}
          aria-label={t('move_page_backward')}
          title={t('move_page_backward')}
          className={cn(ACTION_CLASS, activePageIndex > 0 && ENABLED_CLASS)}
        >
          <ArrowLeftIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => movePage(activePageIndex, 'forward')}
          disabled={activePageIndex >= doc.pages.length - 1}
          aria-label={t('move_page_forward')}
          title={t('move_page_forward')}
          className={cn(
            ACTION_CLASS,
            activePageIndex < doc.pages.length - 1 && ENABLED_CLASS,
          )}
        >
          <ArrowRightIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={duplicatePage}
          aria-label={t('duplicate_page')}
          title={t('duplicate_page')}
          className={cn(ACTION_CLASS, ENABLED_CLASS)}
        >
          <CopyIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => removePage(activePageIndex)}
          disabled={isOnlyPage}
          aria-label={t('delete_page')}
          title={t('delete_page')}
          className={cn(
            ACTION_CLASS,
            !isOnlyPage && `
              cursor-pointer
              hover:bg-destructive/10 hover:text-destructive
            `,
          )}
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
    </div>
  );
};
