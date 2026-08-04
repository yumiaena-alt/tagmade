import { Font } from '@react-pdf/renderer';

export const PDF_FONT_FAMILY = 'NanumGothic';

let registered = false;

/**
 * Registers the Korean face the PDF needs.
 *
 * The fonts bundled with `@react-pdf/renderer` (Helvetica and friends) have no
 * Hangul coverage, so without this every Korean glyph exports blank. Both files
 * are OFL-licensed and served from `public/fonts`.
 *
 * Guarded because `Font.register` is global and the studio can build many PDFs
 * in one session.
 */
export function registerPdfFont(): void {
  if (registered) {
    return;
  }

  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: '/fonts/NanumGothic-Regular.ttf', fontWeight: 'normal' },
      { src: '/fonts/NanumGothic-Bold.ttf', fontWeight: 'bold' },
    ],
  });

  // Korean has no hyphenation; without this every wrapped word is broken up.
  Font.registerHyphenationCallback(word => [word]);

  registered = true;
}
