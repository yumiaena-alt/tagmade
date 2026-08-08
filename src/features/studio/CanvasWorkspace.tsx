'use client';

import type { ImageReadFailure } from './imageUpload';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { PX_PER_MM, useViewStore } from '@/store/useViewStore';
import { CanvasRuler, RULER_SIZE } from './CanvasRulers';
import { CanvasToolbar } from './CanvasToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import { HistoryControls } from './HistoryControls';
import { firstImageFile, readImageFile } from './imageUpload';
import { PageStrip } from './PageStrip';

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

  const addImage = useDocumentStore(state => state.addImage);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [dropFailure, setDropFailure] = useState<ImageReadFailure | null>(null);
  const artworkRef = useRef<HTMLDivElement>(null);

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

  const dropFailureMessages: Record<ImageReadFailure, string> = {
    too_large: t('image_too_large'),
    not_an_image: t('image_not_an_image'),
    unreadable: t('image_unreadable'),
  };

  /**
   * Drops the file where it was released, converting the pointer position back
   * through the current zoom — so an image lands under the cursor rather than
   * at a fixed corner the operator then has to drag it away from.
   */
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropTarget(false);

    const file = firstImageFile(event.dataTransfer);

    if (!file) {
      setDropFailure('not_an_image');

      return;
    }

    const result = await readImageFile(file);

    if (!result.ok) {
      setDropFailure(result.reason);

      return;
    }

    setDropFailure(null);

    const box = artworkRef.current?.getBoundingClientRect();
    const position = box
      ? {
          x: (event.clientX - box.left) / pxPerMm,
          y: (event.clientY - box.top) / pxPerMm,
        }
      : { x: doc.widthMm / 4, y: doc.heightMm / 4 };

    addImage(result.src, position);
  };

  return (
    <div className="
      flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border
      border-border bg-muted/50
    "
    >
      {/*
        The floating controls anchor to this wrapper rather than the outer box,
        so the hint strip below stays clear of them.
      */}
      <div className="relative flex min-h-0 flex-1 flex-col">
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
                  shrink-0 overflow-hidden border-r border-border
                  bg-background/70
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

          <div
            ref={surfaceRef}
            className="relative min-h-0 flex-1 overflow-auto"
            onDragOver={(event) => {
              // Without this the browser navigates to the dropped file.
              event.preventDefault();
              setIsDropTarget(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setIsDropTarget(false);
              }
            }}
            onDrop={(event) => {
              void handleDrop(event);
            }}
          >
            <div
              className="flex items-center justify-center p-8"
              style={{
                minWidth: artworkWidth + FIT_PADDING,
                minHeight: artworkHeight + FIT_PADDING,
              }}
            >
              <div ref={artworkRef} className="shadow-xl shadow-black/15">
                <DocumentCanvas scale={pxPerMm} />
              </div>
            </div>
          </div>
        </div>

        {isDropTarget
          ? (
              <div className={`
                pointer-events-none absolute inset-0 flex items-center
                justify-center border-2 border-dashed border-foreground/40
                bg-background/70 text-sm font-medium
              `}
              >
                {t('image_drop_here')}
              </div>
            )
          : null}

        {dropFailure
          ? (
              <p
                role="alert"
                className={`
                  absolute top-3 left-3 rounded-md bg-background px-2 py-1
                  text-xs font-medium text-destructive shadow-md
                `}
              >
                {dropFailureMessages[dropFailure]}
              </p>
            )
          : null}

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

      {/* The document's pages, below the artwork — see PageStrip. */}
      <PageStrip />

      {/*
        The usage hint sits inside the box rather than under it, so the
        workspace and the panel beside it end at exactly the same line.
      */}
      <p className="
        shrink-0 border-t border-border bg-background/70 px-3 py-1.5 text-center
        text-xs text-muted-foreground
      "
      >
        {t('canvas_hint')}
      </p>
    </div>
  );
};
