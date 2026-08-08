/**
 * Document model for the label studio.
 *
 * A template is not a hardcoded drawing any more — it is a canvas size plus a
 * list of elements. The same data drives three renderers: the SVG thumbnails in
 * the gallery (server-rendered), the interactive Konva canvas, and the PDF
 * exporter. Direct manipulation is therefore just mutating this array.
 *
 * All geometry is in millimetres, so every renderer only differs by its scale.
 */

import type { FontId } from './fonts';

/** Caption shown in the layer list, resolved from the `Editor` namespace. */
type ElementLabelKey
  = | 'field_brand'
    | 'field_sku'
    | 'field_product_name'
    | 'field_price'
    | 'field_qr_url'
    | 'field_exchange_policy'
    | 'field_importer'
    | 'field_manufacturer'
    | 'field_country_of_origin'
    | 'field_material'
    | 'field_size'
    | 'field_manufactured_on'
    | 'field_caution'
    | 'field_certification_number'
    | 'field_quantity'
    | 'field_box_number'
    | 'field_composition'
    | 'field_care_symbols'
    | 'field_text'
    | 'field_shape'
    | 'field_divider'
    | 'field_punch_hole'
    | 'field_barcode'
    | 'field_qr'
    | 'field_image'
    | 'field_kc_mark';

type ElementBase = {
  readonly id: string;
  /** Top-left position in millimetres. */
  readonly x: number;
  readonly y: number;
  readonly labelKey: ElementLabelKey;
  /** Locked elements are guides — visible, but not selectable or draggable. */
  readonly locked?: boolean;
};

export type TextAlign = 'left' | 'center' | 'right';

/** Applied at render time; the stored text keeps whatever was typed. */
export type TextCase = 'none' | 'upper' | 'lower';

/** Bullets or numbers prefixed to each line, again only at render time. */
export type TextList = 'none' | 'bullet' | 'number';

type TextElement = ElementBase & {
  readonly type: 'text';
  readonly text: string;
  readonly width: number;
  readonly fontSize: number;
  readonly bold?: boolean;
  readonly align?: TextAlign;
  readonly muted?: boolean;
  readonly lineHeight?: number;
  readonly fontId?: FontId;
  /** Hex colour. Falls back to the document ink, or the muted ink. */
  readonly color?: string;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strike?: boolean;
  readonly textCase?: TextCase;
  readonly list?: TextList;
  /** Extra space between characters, in millimetres. */
  readonly letterSpacing?: number;
};

type RectElement = ElementBase & {
  readonly type: 'rect';
  readonly width: number;
  readonly height: number;
  readonly dashed?: boolean;
  readonly radius?: number;
};

type DividerElement = ElementBase & {
  readonly type: 'divider';
  readonly width: number;
};

type HoleElement = ElementBase & {
  readonly type: 'hole';
  readonly radius: number;
};

type BarcodeElement = ElementBase & {
  readonly type: 'barcode';
  /** SKU text encoded as Code 128. */
  readonly value: string;
  readonly width: number;
  readonly height: number;
  readonly showValue?: boolean;
};

type CareSymbolsElement = ElementBase & {
  readonly type: 'careSymbols';
  /** Free-form composition text; symbols are matched from it automatically. */
  readonly composition: string;
  readonly glyphWidth: number;
  readonly gap: number;
};

type QrElement = ElementBase & {
  readonly type: 'qr';
  readonly url: string;
  readonly size: number;
};

type ImageElement = ElementBase & {
  readonly type: 'image';
  /**
   * Data URL of an uploaded file. Kept inline so a document stays
   * self-contained and needs no upload endpoint or storage.
   */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Shown while no file has been chosen. */
  readonly caption?: string;
};

export type DocElement
  = | TextElement
    | RectElement
    | DividerElement
    | HoleElement
    | BarcodeElement
    | CareSymbolsElement
    | QrElement
    | ImageElement;

export type ElementType = DocElement['type'];

/**
 * One page of a document.
 *
 * A page owns nothing but its elements. Size and background stay on the
 * document because a label's pages are the front and back of one piece of
 * stock, not independent artboards — printing a document whose page two was a
 * different size would need a second roll.
 */
export type LabelPage = {
  readonly id: string;
  readonly elements: readonly DocElement[];
};

export type LabelDocument = {
  /**
   * Which template this document *is*.
   *
   * A built-in id until the first edit; from then on the id of the entry in the
   * operator's own templates, which is what links the canvas to the thing being
   * auto-recorded.
   */
  readonly templateId: string;
  /** Shown in the title field. Auto-named on the first edit, then editable. */
  readonly name?: string;
  readonly widthMm: number;
  readonly heightMm: number;
  /** Page colour. White when unset, which is what label stock usually is. */
  readonly backgroundColor?: string;
  /** Never empty: a document without a page has nothing to draw. */
  readonly pages: readonly LabelPage[];
};

/**
 * A document with its elements at the top level and no pages.
 *
 * This is how every document was shaped before multi-page, so it is still what
 * arrives from a browser save, an exported file, or the template catalog — all
 * three of which are authored or were written flat. `toPagedDocument` is the
 * one place that upgrades it.
 */
export type FlatDocument = Omit<LabelDocument, 'pages'> & {
  readonly elements: readonly DocElement[];
};

/** Id of the page a flat document becomes. */
export const FIRST_PAGE_ID = 'page-1';

/**
 * The paged form of a document that may still be flat.
 *
 * Every entry point that takes a document from outside the running store —
 * `localStorage`, an imported file, a saved template, the catalog — goes
 * through here, so nothing downstream has to know two shapes. An empty `pages`
 * array is treated as flat too, since a document with no page cannot be drawn.
 */
export function toPagedDocument(doc: LabelDocument | FlatDocument): LabelDocument {
  if ('pages' in doc && doc.pages.length > 0) {
    return doc;
  }

  const { elements, ...rest } = doc as FlatDocument;

  return {
    ...rest,
    pages: [{ id: FIRST_PAGE_ID, elements: elements ?? [] }],
  };
}

/** The page at `index`, falling back to the first — `pages` is never empty. */
export function pageAt(doc: LabelDocument, index: number): LabelPage {
  return doc.pages[index] ?? doc.pages[0]!;
}

/** Elements the user can add from scratch. */
export const ADDABLE_TYPES = [
  'text',
  'rect',
  'divider',
  'barcode',
  'careSymbols',
  'qr',
  'image',
] as const satisfies readonly ElementType[];

export type AddableType = typeof ADDABLE_TYPES[number];

/** Bounding box in millimetres, used for selection and clamping. */
export function elementSize(element: DocElement): {
  width: number;
  height: number;
} {
  switch (element.type) {
    case 'text':
      // Konva wraps to `width`; one line is a close enough handle height.
      return { width: element.width, height: element.fontSize * 1.3 };
    case 'rect':
      return { width: element.width, height: element.height };
    case 'divider':
      return { width: element.width, height: 0.6 };
    case 'hole':
      return { width: element.radius * 2, height: element.radius * 2 };
    case 'barcode':
      return {
        width: element.width,
        height: element.height + (element.showValue ? 2.6 : 0),
      };
    case 'careSymbols':
      return {
        width: element.glyphWidth * 5 + element.gap * 4,
        height: element.glyphWidth,
      };
    case 'qr':
      return { width: element.size, height: element.size };
    case 'image':
      return { width: element.width, height: element.height };
    default:
      return { width: 0, height: 0 };
  }
}

/** Keeps an element inside the page after a drag or resize. */
export function clampElement(
  element: DocElement,
  doc: Pick<LabelDocument, 'widthMm' | 'heightMm'>,
  position: { x: number; y: number },
): { x: number; y: number } {
  const { width, height } = elementSize(element);

  return {
    x: Math.min(Math.max(position.x, 0), Math.max(0, doc.widthMm - width)),
    y: Math.min(Math.max(position.y, 0), Math.max(0, doc.heightMm - height)),
  };
}

/**
 * The lines a text element actually draws: case folding and list markers
 * applied, the stored text left untouched.
 *
 * Shared by all three renderers. Doing it here rather than three times is the
 * only way the thumbnail, the canvas and the PDF can be relied on to agree —
 * a list marker that exists in two of them is a printing bug.
 */
export function textLines(element: {
  readonly text: string;
  readonly textCase?: TextCase;
  readonly list?: TextList;
}): readonly string[] {
  const cased
    = element.textCase === 'upper'
      ? element.text.toUpperCase()
      : element.textCase === 'lower'
        ? element.text.toLowerCase()
        : element.text;

  const lines = cased.split('\n');

  if (element.list === 'bullet') {
    return lines.map(line => `• ${line}`);
  }

  if (element.list === 'number') {
    return lines.map((line, index) => `${index + 1}. ${line}`);
  }

  return lines;
}

/**
 * The element resized by a transform gesture.
 *
 * Takes the scale factors the transformer reports rather than a node, because
 * there is no size to read off the node: Konva writes back only a decomposed
 * transform — position, rotation, scale — so the group the canvas draws each
 * element into never gains a width of its own and `width()` answers 0 for ever.
 * Multiplying `0` by the scale is how every resize used to collapse an element
 * to its minimum instead of the size it was dragged to.
 *
 * Each type keeps a floor small enough to be a deliberate choice and large
 * enough to stay grabbable.
 */
export function resizedElement(
  element: DocElement,
  factorX: number,
  factorY: number,
): Partial<DocElement> {
  switch (element.type) {
    case 'text':
      return { width: Math.max(4, element.width * factorX) };
    case 'rect':
      return {
        width: Math.max(2, element.width * factorX),
        height: Math.max(2, element.height * factorY),
      };
    case 'divider':
      return { width: Math.max(2, element.width * factorX) };
    case 'barcode':
      return {
        width: Math.max(8, element.width * factorX),
        height: Math.max(4, element.height * factorY),
      };
    case 'qr':
      return { size: Math.max(6, element.size * factorX) };
    case 'careSymbols':
      // Five glyphs and four gaps make the block; the gap rides the glyph.
      return { glyphWidth: Math.max(2, element.glyphWidth * factorX) };
    case 'image':
      return {
        width: Math.max(2, element.width * factorX),
        height: Math.max(2, element.height * factorY),
      };
    case 'hole':
      return { radius: Math.max(0.5, element.radius * factorX) };
    default:
      return {};
  }
}

/**
 * The editable content of an element, so the layer list can offer one input per
 * element without knowing each type.
 */
export function elementContent(element: DocElement): string | null {
  switch (element.type) {
    case 'text':
      return element.text;
    case 'barcode':
      return element.value;
    case 'careSymbols':
      return element.composition;
    case 'qr':
      return element.url;
    default:
      return null;
  }
}

/** Applies edited content back onto an element. */
export function withContent(element: DocElement, content: string): DocElement {
  switch (element.type) {
    case 'text':
      return { ...element, text: content };
    case 'barcode':
      return { ...element, value: content };
    case 'careSymbols':
      return { ...element, composition: content };
    case 'qr':
      return { ...element, url: content };
    default:
      return element;
  }
}
