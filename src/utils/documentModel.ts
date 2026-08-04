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
    | 'field_image';

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

type TextElement = ElementBase & {
  readonly type: 'text';
  readonly text: string;
  readonly width: number;
  readonly fontSize: number;
  readonly bold?: boolean;
  readonly align?: TextAlign;
  readonly muted?: boolean;
  readonly lineHeight?: number;
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

export type LabelDocument = {
  /** Template this document started from, for the gallery's "used" hints. */
  readonly templateId: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly elements: readonly DocElement[];
};

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
