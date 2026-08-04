/**
 * Code 128 geometry, shared by every renderer.
 *
 * `jsbarcode` is used only for the encoding maths: `getModule` hands back a
 * DOM-free encoder that returns the raw bit string, which we turn into
 * rectangles. That means the SVG thumbnail, the Konva canvas, and the PDF all
 * draw the same vector bars from one source — no hidden DOM, no rasterization,
 * and no chance of the preview and the print file disagreeing.
 */
import JsBarcode from 'jsbarcode';

/** Code 128 encodes printable ASCII only; Korean or empty input is rejected. */
const CODE128_PATTERN = /^[\x20-\x7E]+$/;

export function isValidCode128(value: string): boolean {
  return CODE128_PATTERN.test(value);
}

type Encoder = {
  encode: () => { data: string; text: string };
};

type EncoderConstructor = new (
  value: string,
  options: Record<string, unknown>,
) => Encoder;

/**
 * `getModule` is a real export of `jsbarcode` but is missing from its bundled
 * type declarations, so it is narrowed here rather than anywhere else.
 */
const getBarcodeModule = (
  JsBarcode as unknown as {
    getModule?: (name: string) => EncoderConstructor | undefined;
  }
).getModule;

/** Bar run in bit units (1 = one narrow module). */
type BarcodeRect = {
  readonly x: number;
  readonly width: number;
};

export type BarcodeSymbol = {
  /** Total width in bit units, for the renderer's viewBox. */
  readonly units: number;
  readonly bars: readonly BarcodeRect[];
};

/**
 * Encodes a value as Code 128 and collapses the bits into bar runs.
 * @param value SKU text to encode.
 * @returns The symbol, or null when the value cannot be encoded.
 */
export function code128Symbol(value: string): BarcodeSymbol | null {
  // Spaces are legal Code 128, but a whitespace-only SKU encodes nothing
  // meaningful — treat it as empty, matching `qrMatrix`.
  if (!value.trim() || !isValidCode128(value) || !getBarcodeModule) {
    return null;
  }

  const Encoder = getBarcodeModule('CODE128');

  if (!Encoder) {
    return null;
  }

  try {
    const bits = new Encoder(value, {}).encode().data;

    if (!bits || bits.length === 0) {
      return null;
    }

    const bars: BarcodeRect[] = [];
    let runStart: number | null = null;

    for (let index = 0; index <= bits.length; index += 1) {
      const isBar = bits[index] === '1';

      if (isBar && runStart === null) {
        runStart = index;
      }

      if (!isBar && runStart !== null) {
        bars.push({ x: runStart, width: index - runStart });
        runStart = null;
      }
    }

    return { units: bits.length, bars };
  } catch {
    return null;
  }
}
