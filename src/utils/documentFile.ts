/**
 * Reading and writing a document as a `.json` file.
 *
 * Work lives in `localStorage` and nowhere else, so clearing browser data or
 * moving machine loses it. A document is already plain data, so a file is the
 * whole backup story — no account, no server, no storage bill.
 *
 * Import is the dangerous direction: a hand-edited or truncated file must not
 * be able to put the canvas into a state the renderers cannot draw. Everything
 * that arrives is therefore checked field by field before it reaches the store,
 * and anything unrecognised is rejected rather than patched up.
 */
import type {
  DocElement,
  ElementType,
  FlatDocument,
  LabelDocument,
  LabelPage,
} from './documentModel';
import { toPagedDocument } from './documentModel';

/**
 * Bumped only if the shape changes in a way older files cannot satisfy.
 *
 * 2 introduced `pages`. Version 1 files still open — they are read as a
 * one-page document — but a version 2 file cannot be handed back to a build
 * that only knows version 1, which is what the ceiling below refuses.
 */
const FILE_VERSION = 2;

const FILE_KIND = 'tagmade.label-document';

/** Wrapper written to disk, so a file can be recognised before it is trusted. */
type DocumentFile = {
  readonly kind: typeof FILE_KIND;
  readonly version: number;
  readonly savedAt: string;
  readonly document: LabelDocument;
};

export type ParseResult
  = | { readonly ok: true; readonly doc: LabelDocument }
    | { readonly ok: false; readonly reason: ParseFailure };

/** Why an import was refused; the caller maps this to a localized message. */
export type ParseFailure = 'invalid_json' | 'not_a_document' | 'unsupported_version';

const ELEMENT_TYPES: readonly ElementType[] = [
  'text',
  'rect',
  'divider',
  'hole',
  'barcode',
  'careSymbols',
  'qr',
  'image',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks the fields each renderer reads for a given type.
 *
 * Only the ones a renderer would crash or silently mis-draw on are required;
 * optional styling is left to the element's own defaults.
 */
function isValidElement(value: unknown): value is DocElement {
  if (!isRecord(value)) {
    return false;
  }

  const { type } = value;

  if (typeof type !== 'string' || !ELEMENT_TYPES.includes(type as ElementType)) {
    return false;
  }

  if (
    typeof value.id !== 'string'
    || typeof value.labelKey !== 'string'
    || !isFiniteNumber(value.x)
    || !isFiniteNumber(value.y)
  ) {
    return false;
  }

  switch (type as ElementType) {
    case 'text':
      return typeof value.text === 'string'
        && isFiniteNumber(value.width)
        && isFiniteNumber(value.fontSize);
    case 'rect':
      return isFiniteNumber(value.width) && isFiniteNumber(value.height);
    case 'divider':
      return isFiniteNumber(value.width);
    case 'hole':
      return isFiniteNumber(value.radius);
    case 'barcode':
      return typeof value.value === 'string'
        && isFiniteNumber(value.width)
        && isFiniteNumber(value.height);
    case 'careSymbols':
      return typeof value.composition === 'string'
        && isFiniteNumber(value.glyphWidth)
        && isFiniteNumber(value.gap);
    case 'qr':
      return typeof value.url === 'string' && isFiniteNumber(value.size);
    case 'image':
      return typeof value.src === 'string'
        && isFiniteNumber(value.width)
        && isFiniteNumber(value.height);
    default:
      return false;
  }
}

function isValidPage(value: unknown): value is LabelPage {
  return isRecord(value)
    && typeof value.id === 'string'
    && Array.isArray(value.elements)
    && value.elements.every(isValidElement);
}

/**
 * Accepts both document shapes.
 *
 * Version 1 files put the elements at the top level, and those files are still
 * out there on people's disks — refusing them because the app grew pages would
 * be losing someone's work over a field name.
 */
function isValidDocument(value: unknown): value is LabelDocument | FlatDocument {
  if (!isRecord(value)) {
    return false;
  }

  const hasPages = Array.isArray(value.pages)
    ? value.pages.length > 0 && value.pages.every(isValidPage)
    : Array.isArray(value.elements) && value.elements.every(isValidElement);

  return typeof value.templateId === 'string'
    && isFiniteNumber(value.widthMm)
    && value.widthMm > 0
    && isFiniteNumber(value.heightMm)
    && value.heightMm > 0
    && hasPages;
}

/** The document as file text, pretty-printed so a diff of two saves is readable. */
export function serializeDocument(doc: LabelDocument): string {
  const file: DocumentFile = {
    kind: FILE_KIND,
    version: FILE_VERSION,
    savedAt: new Date().toISOString(),
    document: doc,
  };

  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * Validates file text and returns the document inside it.
 *
 * A bare document object is accepted too, so a file someone assembled by hand
 * (or an older export) still opens.
 */
export function parseDocument(text: string): ParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: 'not_a_document' };
  }

  if (parsed.kind === FILE_KIND) {
    if (!isFiniteNumber(parsed.version) || parsed.version > FILE_VERSION) {
      return { ok: false, reason: 'unsupported_version' };
    }

    return isValidDocument(parsed.document)
      ? { ok: true, doc: toPagedDocument(parsed.document) }
      : { ok: false, reason: 'not_a_document' };
  }

  return isValidDocument(parsed)
    ? { ok: true, doc: toPagedDocument(parsed) }
    : { ok: false, reason: 'not_a_document' };
}

/** Filename for a saved document: the template id, made safe for a filesystem. */
export function documentFileName(doc: LabelDocument): string {
  const safe = doc.templateId.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');

  return `${safe || 'label'}.json`;
}
