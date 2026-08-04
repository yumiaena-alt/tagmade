/**
 * Care symbol artwork shared by the DOM icon list, the Konva canvas, and the PDF.
 *
 * All outlines live in a 24x24 box so a single set of path strings can be scaled
 * to any of the three renderers.
 *
 * NOTE: these are legible approximations of the KS K 0021 pictograms, not the
 * official artwork. The Korean caption from `careRules` carries the legal
 * meaning; swap in licensed KS assets before sending labels to production print.
 */

export type CareGlyphShape = 'tub' | 'triangle' | 'square' | 'iron' | 'circle';

export type CareShape = {
  /** Main outline path in the 24x24 box. */
  readonly outline: string;
  /** Decorative stroke drawn only when the glyph has no inner mark. */
  readonly detail?: string;
  /** Baseline for the inner mark text. */
  readonly markY: number;
  readonly markSize: number;
};

export const CARE_SHAPES: Record<CareGlyphShape, CareShape> = {
  tub: {
    outline: 'M2.4 8.6H21.6L19.8 20.2A1.8 1.8 0 0 1 18 21.6H6A1.8 1.8 0 0 1 4.2 20.2Z',
    detail: 'M5.6 12.4c1.9-1.7 3.4 1.7 5.3 0s3.4 1.7 5.3 0',
    markY: 17.6,
    markSize: 7.5,
  },
  triangle: {
    outline: 'M12 3.2 21.6 20.6H2.4Z',
    markY: 18.2,
    markSize: 6.5,
  },
  square: {
    outline: 'M3.2 4h17.6v16.8H3.2Z',
    markY: 15.6,
    markSize: 8,
  },
  iron: {
    outline: 'M4.6 17.4 5.9 11.6C6.3 9.6 7.9 8.4 9.9 8.4h4.4c1.9 0 3.2 1.1 3.5 2.9l1.1 6.1Z',
    detail: 'M2.8 19.4h18.4',
    markY: 16.2,
    markSize: 6,
  },
  circle: {
    outline: 'M12 3.3A8.7 8.7 0 1 0 12 20.7 8.7 8.7 0 0 0 12 3.3Z',
    markY: 15.4,
    markSize: 8.5,
  },
};

/** Diagonal stroke drawn over a prohibited action. */
export const PROHIBITION_STROKE = {
  from: { x: 3.4, y: 20.6 },
  to: { x: 20.6, y: 3.4 },
} as const;

export type CareGlyph = {
  readonly shape: CareGlyphShape;
  /** Short mark drawn inside the outline (temperature, dots, letters). */
  readonly mark?: string;
  readonly prohibited?: boolean;
};

/** Icon code from `careRules` -> artwork. */
export const CARE_GLYPHS: Record<string, CareGlyph> = {
  // 물세탁
  WASH_40: { shape: 'tub', mark: '40' },
  WASH_30_MILD: { shape: 'tub', mark: '30' },
  WASH_HAND_30: { shape: 'tub', mark: '손' },
  WASH_DO_NOT: { shape: 'tub', prohibited: true },
  // 표백
  BLEACH_ANY: { shape: 'triangle' },
  BLEACH_NON_CHLORINE: { shape: 'triangle', mark: 'O' },
  BLEACH_DO_NOT: { shape: 'triangle', prohibited: true },
  // 건조
  DRY_LINE: { shape: 'square', mark: '|||' },
  DRY_LINE_SHADE: { shape: 'square', mark: '///' },
  DRY_FLAT_SHADE: { shape: 'square', mark: '=' },
  DRY_TUMBLE_LOW: { shape: 'square', mark: '•' },
  // 다림질
  IRON_180: { shape: 'iron', mark: '•••' },
  IRON_150: { shape: 'iron', mark: '••' },
  IRON_110_NO_STEAM: { shape: 'iron', mark: '•' },
  IRON_110_CLOTH: { shape: 'iron', mark: '•' },
  // 드라이클리닝
  DRYCLEAN_ANY: { shape: 'circle', mark: 'P' },
  DRYCLEAN_PETROLEUM: { shape: 'circle', mark: 'F' },
  DRYCLEAN_REQUIRED: { shape: 'circle', mark: 'P' },
};

/** The glyph box edge length, matching the path viewBox. */
export const CARE_GLYPH_BOX = 24;
