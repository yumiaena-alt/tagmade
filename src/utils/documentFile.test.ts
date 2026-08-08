import type { DocElement, FlatDocument, LabelDocument } from './documentModel';
import { describe, expect, it } from 'vitest';
import {
  documentFileName,
  parseDocument,
  serializeDocument,
} from './documentFile';

const ELEMENTS: readonly DocElement[] = [
  {
    type: 'text',
    id: 'brand',
    labelKey: 'field_brand',
    x: 2.5,
    y: 3,
    width: 25,
    fontSize: 4,
    text: 'BVRI',
    bold: true,
  },
  {
    type: 'qr',
    id: 'qr',
    labelKey: 'field_qr',
    x: 5,
    y: 40,
    url: 'https://example.com',
    size: 18,
  },
];

const DOC: LabelDocument = {
  templateId: 'care-label-standard',
  widthMm: 30,
  heightMm: 70,
  pages: [{ id: 'page-1', elements: ELEMENTS }],
};

/** How every file written before multi-page looks. */
const FLAT: FlatDocument = {
  templateId: 'care-label-standard',
  widthMm: 30,
  heightMm: 70,
  elements: ELEMENTS,
};

describe('serializeDocument', () => {
  it('round-trips a document through the file format', () => {
    const result = parseDocument(serializeDocument(DOC));

    expect(result.ok).toBe(true);
    expect(result.ok && result.doc).toEqual(DOC);
  });

  it('records the file kind and version so an import can recognise it', () => {
    const file = JSON.parse(serializeDocument(DOC));

    expect(file.kind).toBe('tagmade.label-document');
    expect(file.version).toBe(2);
  });
});

describe('parseDocument', () => {
  it('accepts a bare document object without the file wrapper', () => {
    const result = parseDocument(JSON.stringify(DOC));

    expect(result.ok).toBe(true);
  });

  it('reads a file written before multi-page as a one-page document', () => {
    const version1 = {
      kind: 'tagmade.label-document',
      version: 1,
      savedAt: new Date(0).toISOString(),
      document: FLAT,
    };

    const result = parseDocument(JSON.stringify(version1));

    expect(result.ok).toBe(true);
    expect(result.ok && result.doc.pages).toHaveLength(1);
    expect(result.ok && result.doc.pages[0]!.elements).toEqual(ELEMENTS);
  });

  it('rejects text that is not JSON', () => {
    const result = parseDocument('not json at all');

    expect(result).toEqual({ ok: false, reason: 'invalid_json' });
  });

  it('rejects a file written by a newer version', () => {
    const file = { ...JSON.parse(serializeDocument(DOC)), version: 99 };
    const result = parseDocument(JSON.stringify(file));

    expect(result).toEqual({ ok: false, reason: 'unsupported_version' });
  });

  it.each([
    ['a page with no size', { ...FLAT, widthMm: undefined }],
    ['a page sized zero', { ...FLAT, heightMm: 0 }],
    ['elements that are not an array', { ...FLAT, elements: 'nope' }],
    ['an unknown element type', {
      ...FLAT,
      elements: [{ type: 'video', id: 'v', labelKey: 'field_text', x: 0, y: 0 }],
    }],
    ['a text element with no font size', {
      ...FLAT,
      elements: [{
        type: 'text',
        id: 't',
        labelKey: 'field_text',
        x: 0,
        y: 0,
        width: 10,
        text: 'hi',
      }],
    }],
    ['coordinates that are not numbers', {
      ...FLAT,
      elements: [{ ...ELEMENTS[0], x: 'left' }],
    }],
    ['a QR element with no size', {
      ...FLAT,
      elements: [{
        type: 'qr',
        id: 'q',
        labelKey: 'field_qr',
        x: 0,
        y: 0,
        url: 'https://example.com',
      }],
    }],
    ['a document with an empty page list', { ...DOC, pages: [] }],
    ['a page with no id', { ...DOC, pages: [{ elements: ELEMENTS }] }],
    ['a page holding a broken element', {
      ...DOC,
      pages: [{ id: 'page-1', elements: [{ ...ELEMENTS[0], fontSize: 'big' }] }],
    }],
  ])('rejects %s', (_label, broken) => {
    const result = parseDocument(JSON.stringify(broken));

    expect(result).toEqual({ ok: false, reason: 'not_a_document' });
  });

  it('rejects a JSON array', () => {
    expect(parseDocument('[]')).toEqual({ ok: false, reason: 'not_a_document' });
  });

  it('keeps optional styling it does not know how to validate', () => {
    const withExtras = {
      ...DOC,
      pages: [{
        id: 'page-1',
        elements: [{ ...ELEMENTS[0], align: 'center', muted: true }],
      }],
    };
    const result = parseDocument(JSON.stringify(withExtras));

    expect(result.ok && result.doc.pages[0]!.elements[0]).toMatchObject({
      align: 'center',
      muted: true,
    });
  });
});

describe('documentFileName', () => {
  it('names the file after the template', () => {
    expect(documentFileName(DOC)).toBe('care-label-standard.json');
  });

  it('strips characters a filesystem would reject', () => {
    expect(documentFileName({ ...DOC, templateId: 'my label/2026?' }))
      .toBe('my-label-2026.json');
  });

  it('falls back when the template id has nothing usable left', () => {
    expect(documentFileName({ ...DOC, templateId: '///' })).toBe('label.json');
  });
});
