'use client';

import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { PX_PER_MM, useViewStore } from '@/store/useViewStore';
import { CanvasRuler, RULER_SIZE } from './CanvasRulers';
import { CanvasToolbar } from './CanvasToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import { HistoryControls } from './HistoryControls';

/** Breathing room around the artwork when fitting it to the viewport. */
const FIT_PADDING = 64;
const ZOOM_STEP = 1.25;

/**
 * The workspace: rulers along two edges, the artwork centred on a scrollable
 * surface, and zoom controls.
 *
 * Zoom lives in `useViewStore` rather than being derived from the container, so
 * the operator stays where they put themselves when the document changes size,
 * and "fit" becomes an explicit action instead of a permanent override.
 */
export const CanvasWorkspace = () => {
  const t = useTranslations('Studio');
  const doc = useDocumentStore(state => state.doc);
  const zoom = useViewStore(state => state.zoom);
  const showRulers = useViewStore(state => state.showRulers);
  const fitRequested = useViewStore(state => state.fitRequested);
  const setZoom = useViewStore(state => state.setZoom);
  const zoomBy = useViewStore(state => state.zoomBy);
  const requestFit = useViewStore(state => state.requestFit);

  const surfaceRef = useRef<HTMLDivElement>(null);
  // Measures the surface directly rather than trusting observer state, which
  // may not have landed yet on the first paint — that left the artwork stuck at
  // 100%, which for a 30mm label is barely 113px wide.
  const fit = useCallback(() => {
    const node = surfaceRef.current;

    if (!node || node.clientWidth === 0) {
      return;
    }

    const next = Math.min(
      (node.clientWidth - FIT_PADDING) / (doc.widthMm * PX_PER_MM),
      (node.clientHeight - FIT_PADDING) / (doc.heightMm * PX_PER_MM),
    );

    setZoom(next);
  }, [doc.widthMm, doc.heightMm, setZoom]);

  // A pending fit needs two triggers, and both are required:
  //
  // - this effect, for a fit asked for while the layout is already settled
  //   (the Fit button, a template swap, a page-size preset)
  // - the observer below, for the first paint, where the studio mounts inside a
  //   client-only boundary and the surface still measures zero
  //
  // With only the effect the initial fit silently no-ops; with only the observer
  // the Fit button does nothing, because clicking it resizes nothing.
  useEffect(() => {
    if (fitRequested) {
      fit();
    }
  }, [fitRequested, fit]);

  // Fit whenever the surface reports a size, as long as a fit is pending.
  //
  // The studio mounts inside a client-only boundary, so on the first frame the
  // flex chain has not resolved and the surface still measures zero — fitting
  // then silently left the artwork at 100%. Driving it from the observer means
  // the fit lands as soon as a real size exists, and also re-fits on window
  // resize until the operator sets a zoom of their own.
  useEffect(() => {
    const node = surfaceRef.current;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (useViewStore.getState().fitRequested) {
        fit();
      }
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [fit]);

  const pxPerMm = PX_PER_MM * zoom;
  const artworkWidth = doc.widthMm * pxPerMm;
  const artworkHeight = doc.heightMm * pxPerMm;

  return (
    <div className="
      relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border
      border-border bg-muted/50
    "
    >
      {showRulers
        ? (
            <div className="
              flex shrink-0 border-b border-border bg-background/70
            "
            >
              <div
                className="shrink-0 border-r border-border"
                style={{ width: RULER_SIZE, height: RULER_SIZE }}
              />
              <div className="overflow-hidden">
                <CanvasRuler
                  lengthMm={doc.widthMm}
                  pxPerMm={pxPerMm}
                  orientation="horizontal"
                />
              </div>
            </div>
          )
        : null}

      <div className="flex min-h-0 flex-1">
        {showRulers
          ? (
              <div className="
                shrink-0 overflow-hidden border-r border-border bg-background/70
              "
              >
                <CanvasRuler
                  lengthMm={doc.heightMm}
                  pxPerMm={pxPerMm}
                  orientation="vertical"
                />
              </div>
            )
          : null}

        <div ref={surfaceRef} className="min-h-0 flex-1 overflow-auto">
          <div
            className="flex items-center justify-center p-8"
            style={{
              minWidth: artworkWidth + FIT_PADDING,
              minHeight: artworkHeight + FIT_PADDING,
            }}
          >
            <div className="shadow-xl shadow-black/15">
              <DocumentCanvas scale={pxPerMm} />
            </div>
          </div>
        </div>
      </div>

      <HistoryControls />

      {/* Add/delete, in the strip left of the zoom stack — see CanvasToolbar. */}
      <CanvasToolbar />

      {/* Zoom controls, kept out of the scroll surface so they never scroll away. */}
      <div className="
        absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg
        border border-border bg-background shadow-md
      "
      >
        <button
          type="button"
          onClick={() => zoomBy(ZOOM_STEP)}
          aria-label={t('zoom_in')}
          className="
            cursor-pointer p-1.5 transition-colors
            hover:bg-accent
          "
        >
          <PlusIcon className="size-4" />
        </button>
        <span className="
          border-y border-border px-1.5 py-1 text-center text-[10px]
          tabular-nums
        "
        >
          {Math.round(zoom * 100)}
          %
        </span>
        <button
          type="button"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          aria-label={t('zoom_out')}
          className="
            cursor-pointer p-1.5 transition-colors
            hover:bg-accent
          "
        >
          <MinusIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={requestFit}
          aria-label={t('zoom_fit')}
          className="
            cursor-pointer border-t border-border p-1.5 text-[10px]
            transition-colors
            hover:bg-accent
          "
        >
          {t('zoom_fit_short')}
        </button>
      </div>
    </div>
  );
};
