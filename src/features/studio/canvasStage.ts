import type Konva from 'konva';

/**
 * A handle on the live Konva stage, for exporting what is on screen.
 *
 * A module-level reference rather than a store field or context: the stage is a
 * mutable DOM-backed object, not state anything renders from, and putting it in
 * a store would make every subscriber re-render when the canvas remounts.
 *
 * PNG export has to go through this stage rather than re-rendering the SVG into
 * a canvas, because the webfonts are already loaded and measured here — an SVG
 * drawn into an `<img>` cannot reach them and would export in a fallback face.
 */
let stage: Konva.Stage | null = null;

export function setCanvasStage(next: Konva.Stage | null): void {
  stage = next;
}

/** Dots per millimetre at 300dpi, the usual floor for print artwork. */
const PRINT_DPMM = 300 / 25.4;

export type PngExport = {
  readonly dataUrl: string;
  readonly widthPx: number;
  readonly heightPx: number;
};

/**
 * Renders the stage at print resolution.
 *
 * @param currentPxPerMm What the stage is drawn at right now, so the ratio
 * lifts the export to 300dpi whatever zoom the operator happens to be using.
 */
export function exportStagePng(currentPxPerMm: number): PngExport | null {
  if (!stage || currentPxPerMm <= 0) {
    return null;
  }

  const pixelRatio = PRINT_DPMM / currentPxPerMm;
  // The selection handles are Konva nodes on the same layer as the artwork, so
  // without hiding them the indigo transform box is baked into the picture. An
  // export is of the label, not of the editor looking at it.
  const overlays = stage.find('Transformer').filter(node => node.visible());

  overlays.forEach(node => node.visible(false));

  try {
    return {
      dataUrl: stage.toDataURL({ pixelRatio, mimeType: 'image/png' }),
      widthPx: Math.round(stage.width() * pixelRatio),
      heightPx: Math.round(stage.height() * pixelRatio),
    };
  } finally {
    overlays.forEach(node => node.visible(true));
  }
}

/**
 * How long to wait for a redraw before capturing anyway.
 *
 * A hidden tab never animates, and an export that hangs for ever because the
 * operator switched away is worse than one captured a frame early.
 */
const PAINT_TIMEOUT_MS = 250;

/**
 * Resolves once the canvas has had a chance to redraw after a state change.
 *
 * Needed to export every page: each is captured by pointing the store at it and
 * reading the same live stage, so the capture has to come after React has
 * committed the new page and Konva has drawn it.
 */
export function nextCanvasPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    // Two frames: one for React to commit, one for Konva to draw.
    requestAnimationFrame(() => requestAnimationFrame(done));
    setTimeout(done, PAINT_TIMEOUT_MS);
  });
}
