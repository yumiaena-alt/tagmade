/**
 * QR code geometry, shared by every renderer.
 *
 * `qrcode` is used only for the encoding maths — it hands back the raw module
 * matrix, which we turn into rectangles. That keeps the SVG thumbnail, the Konva
 * canvas, and the PDF drawing the same vector shapes from one source, instead of
 * each embedding a different rasterized image.
 */
import { create as createQr } from 'qrcode';

/** Row-major module grid. `true` is a dark module. */
export type QrMatrix = {
  readonly size: number;
  readonly modules: readonly boolean[];
};

/** Rectangle in module units (1 = one QR module). */
export type QrRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
};

/**
 * Encodes text into a module matrix.
 * @param text Payload to encode, typically a URL.
 * @returns The matrix, or null when the text is empty or cannot be encoded.
 */
export function qrMatrix(text: string): QrMatrix | null {
  if (!text.trim()) {
    return null;
  }

  try {
    const qr = createQr(text, { errorCorrectionLevel: 'M' });

    return {
      size: qr.modules.size,
      modules: Array.from(qr.modules.data, value => value === 1),
    };
  } catch {
    // Over-long payloads throw; the caller renders an empty slot instead.
    return null;
  }
}

/**
 * Collapses each row of dark modules into horizontal runs.
 *
 * A 25x25 code is 625 modules but only ~90 runs, which keeps the PDF content
 * stream and the Konva node count small without changing what is drawn.
 */
export function qrRects(matrix: QrMatrix): readonly QrRect[] {
  const rects: QrRect[] = [];

  for (let row = 0; row < matrix.size; row += 1) {
    let runStart: number | null = null;

    for (let col = 0; col <= matrix.size; col += 1) {
      const isDark
        = col < matrix.size && matrix.modules[row * matrix.size + col] === true;

      if (isDark && runStart === null) {
        runStart = col;
      }

      if (!isDark && runStart !== null) {
        rects.push({ x: runStart, y: row, width: col - runStart });
        runStart = null;
      }
    }
  }

  return rects;
}
