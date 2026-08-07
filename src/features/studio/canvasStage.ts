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

  return {
    dataUrl: stage.toDataURL({ pixelRatio, mimeType: 'image/png' }),
    widthPx: Math.round(stage.width() * pixelRatio),
    heightPx: Math.round(stage.height() * pixelRatio),
  };
}
