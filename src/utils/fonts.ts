/**
 * The typefaces a label can be set in.
 *
 * Every family here ships as a real file in `public/fonts`, because the PDF
 * embeds the same face the canvas draws with. A family the PDF cannot embed
 * would look right on screen and wrong in print, which is exactly the class of
 * mismatch the millimetre-based geometry exists to prevent — so the picker
 * offers this list and nothing else.
 *
 * All three are OFL-licensed; the licence files sit beside the fonts.
 */

export type FontId = 'nanumGothic' | 'pretendard' | 'montserrat';

type FontFile = {
  readonly src: string;
  readonly weight: 'normal' | 'bold';
  readonly style: 'normal' | 'italic';
};

export type FontFace = {
  readonly id: FontId;
  /** Shown in the picker; the family's own name, not a translated one. */
  readonly label: string;
  /** Family name used by CSS, Konva and `@react-pdf` alike. */
  readonly family: string;
  /** Fallbacks for the split second before the webfont lands. */
  readonly cssStack: string;
  readonly files: readonly FontFile[];
  /**
   * Whether a true italic face exists. Korean families ship none, and neither
   * Konva nor `@react-pdf` fakes one convincingly — so the italic control is
   * disabled rather than silently doing nothing in the export.
   */
  readonly hasItalic: boolean;
};

export const FONTS: readonly FontFace[] = [
  {
    id: 'nanumGothic',
    label: '나눔고딕',
    family: 'NanumGothic',
    cssStack: '"NanumGothic", "Malgun Gothic", sans-serif',
    files: [
      { src: '/fonts/NanumGothic-Regular.ttf', weight: 'normal', style: 'normal' },
      { src: '/fonts/NanumGothic-Bold.ttf', weight: 'bold', style: 'normal' },
    ],
    hasItalic: false,
  },
  {
    id: 'pretendard',
    label: 'Pretendard',
    family: 'Pretendard',
    cssStack: '"Pretendard", "Malgun Gothic", sans-serif',
    files: [
      { src: '/fonts/Pretendard-Regular.otf', weight: 'normal', style: 'normal' },
      { src: '/fonts/Pretendard-Bold.otf', weight: 'bold', style: 'normal' },
    ],
    hasItalic: false,
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    family: 'Montserrat',
    cssStack: '"Montserrat", sans-serif',
    files: [
      { src: '/fonts/Montserrat-Regular.ttf', weight: 'normal', style: 'normal' },
      { src: '/fonts/Montserrat-Bold.ttf', weight: 'bold', style: 'normal' },
      { src: '/fonts/Montserrat-Italic.ttf', weight: 'normal', style: 'italic' },
      { src: '/fonts/Montserrat-BoldItalic.ttf', weight: 'bold', style: 'italic' },
    ],
    hasItalic: true,
  },
];

/** What a text element with no font of its own is drawn in. */
export const DEFAULT_FONT_ID: FontId = 'nanumGothic';

export function fontById(id: FontId | undefined): FontFace {
  return FONTS.find(font => font.id === id)
    ?? FONTS.find(font => font.id === DEFAULT_FONT_ID)!;
}
