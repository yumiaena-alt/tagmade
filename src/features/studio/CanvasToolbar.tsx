'use client';

import type { ReactNode } from 'react';
import type { AddableType } from '@/utils/documentModel';
import {
  BarChartIcon,
  CopyIcon,
  DividerHorizontalIcon,
  ImageIcon,
  SquareIcon,
  TextIcon,
  TrashIcon,
  ViewGridIcon,
} from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { CARE_GLYPH_BOX, CARE_SHAPES } from '@/features/label/careSymbolShapes';
import { useDocumentStore } from '@/store/useDocumentStore';
import { ADDABLE_TYPES } from '@/utils/documentModel';
import { cn } from '@/utils/Helpers';
import { useAddElementLabels } from './useAddElementLabels';

/**
 * The care-symbol tub, borrowed from the label artwork.
 *
 * A radix glyph for "laundry care" does not exist, and the placeholder outline
 * the canvas already draws reads correctly at 16px — so no new artwork.
 */
const CareSymbolsGlyph = () => (
  <svg
    viewBox={`0 0 ${CARE_GLYPH_BOX} ${CARE_GLYPH_BOX}`}
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={CARE_SHAPES.tub.outline} />
  </svg>
);

const ADD_ICONS: Record<AddableType, ReactNode> = {
  text: <TextIcon className="size-4" />,
  rect: <SquareIcon className="size-4" />,
  divider: <DividerHorizontalIcon className="size-4" />,
  // Vertical bars of uneven height: the closest available barcode metaphor.
  barcode: <BarChartIcon className="size-4" />,
  careSymbols: <CareSymbolsGlyph />,
  // A cell grid, which is what a QR code is.
  qr: <ViewGridIcon className="size-4" />,
  image: <ImageIcon className="size-4" />,
};

/**
 * Floating toolbar for adding an element, and removing the selected one,
 * without leaving the canvas.
 *
 * The same actions exist in the layer panel with full captions — that stays the
 * discoverable route. This is the fast one, and it is the only one reachable
 * while the left column is showing the template gallery.
 *
 * Positioned in the strip left of the zoom stack rather than centred on the
 * whole workspace, so the two controls can never overlap on a narrow viewport.
 */
export const CanvasToolbar = () => {
  const t = useTranslations('Studio');
  const addLabels = useAddElementLabels();
  const addElement = useDocumentStore(state => state.addElement);
  const duplicateSelected = useDocumentStore(state => state.duplicateSelected);
  const removeSelected = useDocumentStore(state => state.removeSelected);
  const selectedIds = useDocumentStore(state => state.selectedIds);
  const hasSelection = selectedIds.length > 0;

  return (
    <div className="
      pointer-events-none absolute right-16 bottom-3 left-3 flex justify-center
    "
    >
      <div
        role="group"
        aria-label={t('toolbar_label')}
        className="
          pointer-events-auto flex max-w-full overflow-x-auto rounded-lg border
          border-border bg-background shadow-md
        "
      >
        {ADDABLE_TYPES.map((type, index) => {
          const label = t('add_element', { name: addLabels[type] });

          return (
            <button
              key={type}
              type="button"
              onClick={() => addElement(type)}
              aria-label={label}
              title={label}
              className={cn(
                `
                  shrink-0 cursor-pointer p-1.5 transition-colors
                  hover:bg-accent
                `,
                index > 0 && 'border-l border-border',
              )}
            >
              {ADD_ICONS[type]}
            </button>
          );
        })}

        <span aria-hidden="true" className="w-px shrink-0 bg-border" />

        <button
          type="button"
          onClick={duplicateSelected}
          disabled={!hasSelection}
          aria-label={t('duplicate_element')}
          title={t('duplicate_element')}
          className={cn(
            'shrink-0 p-1.5 transition-colors',
            hasSelection
              ? `
                cursor-pointer
                hover:bg-accent
              `
              : 'cursor-not-allowed text-muted-foreground/40',
          )}
        >
          <CopyIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={removeSelected}
          disabled={!hasSelection}
          aria-label={t('delete_element')}
          title={t('delete_element')}
          className={cn(
            'shrink-0 p-1.5 transition-colors',
            hasSelection
              ? `
                cursor-pointer
                hover:bg-destructive/10 hover:text-destructive
              `
              : 'cursor-not-allowed text-muted-foreground/40',
          )}
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
    </div>
  );
};
