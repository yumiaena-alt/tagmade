import type { LabelDocument } from '@/utils/documentModel';
import type { FontFace, FontId } from '@/utils/fonts';
import { Font } from '@react-pdf/renderer';
import { visibleElements } from '@/utils/documentModel';
import { DEFAULT_FONT_ID, fontById } from '@/utils/fonts';

/** Family every page falls back to, and the one Korean text needs. */
export const PDF_FONT_FAMILY = fontById(DEFAULT_FONT_ID).family;

const registered = new Set<FontId>();

function register(font: FontFace): void {
  if (registered.has(font.id)) {
    return;
  }

  Font.register({
    family: font.family,
    fonts: font.files.map(file => ({
      src: file.src,
      fontWeight: file.weight,
      fontStyle: file.style,
    })),
  });

  registered.add(font.id);
}

/**
 * Registers the faces this document actually uses.
 *
 * The fonts bundled with `@react-pdf/renderer` (Helvetica and friends) have no
 * Hangul coverage, so without registration every Korean glyph exports blank.
 *
 * Only the families in use are registered, because each Korean face is a couple
 * of megabytes and embedding all of them would put that weight into every PDF
 * regardless of what the label is set in. The default family always goes in —
 * it is the page-level fallback.
 *
 * Guarded per family because `Font.register` is global and the studio can build
 * many PDFs in one session.
 */
export function registerPdfFonts(doc: LabelDocument): void {
  register(fontById(DEFAULT_FONT_ID));

  // Every page, not just the one on screen: a face used only on page two still
  // has to be in the file.
  for (const page of doc.pages) {
    // Hidden text is not drawn, so its face would be megabytes of dead weight.
    for (const element of visibleElements(page.elements)) {
      if (element.type === 'text') {
        register(fontById(element.fontId));
      }
    }
  }

  // Korean has no hyphenation; without this every wrapped word is broken up.
  Font.registerHyphenationCallback(word => [word]);
}
