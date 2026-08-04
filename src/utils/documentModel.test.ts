import type { DocElement } from './documentModel';
import { describe, expect, it } from 'vitest';
import {
  clampElement,
  elementContent,
  elementSize,
  withContent,
} from './documentModel';

const page = { widthMm: 50, heightMm: 80 };

const textElement: DocElement = {
  type: 'text',
  id: 'brand',
  labelKey: 'field_brand',
  x: 5,
  y: 5,
  width: 30,
  fontSize: 4,
  text: 'BVRI',
};

const barcodeElement: DocElement = {
  type: 'barcode',
  id: 'sku',
  labelKey: 'field_barcode',
  x: 2,
  y: 2,
  value: 'BVRI-0001',
  width: 24,
  height: 8,
  showValue: true,
};

const careElement: DocElement = {
  type: 'careSymbols',
  id: 'care',
  labelKey: 'field_care_symbols',
  x: 0,
  y: 0,
  composition: '면 100%',
  glyphWidth: 4,
  gap: 1,
};

describe('documentModel', () => {
  describe('elementSize', () => {
    it('derives a text handle height from its font size', () => {
      expect(elementSize(textElement)).toEqual({ width: 30, height: 5.2 });
    });

    it('includes the printed value in a barcode footprint', () => {
      expect(elementSize(barcodeElement)).toEqual({ width: 24, height: 10.6 });
    });

    it('excludes the caption when the barcode hides its value', () => {
      expect(elementSize({ ...barcodeElement, showValue: false }).height).toBe(8);
    });

    it('spans five glyphs and four gaps for a care symbol row', () => {
      expect(elementSize(careElement)).toEqual({ width: 24, height: 4 });
    });

    it('measures a rect by its own dimensions', () => {
      expect(
        elementSize({
          type: 'rect',
          id: 'frame',
          labelKey: 'field_shape',
          x: 0,
          y: 0,
          width: 12,
          height: 7,
        }),
      ).toEqual({ width: 12, height: 7 });
    });

    it('measures a hole across its diameter', () => {
      expect(
        elementSize({
          type: 'hole',
          id: 'punch',
          labelKey: 'field_punch_hole',
          x: 0,
          y: 0,
          radius: 2,
        }),
      ).toEqual({ width: 4, height: 4 });
    });
  });

  describe('clampElement', () => {
    it('leaves an in-bounds position untouched', () => {
      expect(clampElement(textElement, page, { x: 10, y: 20 })).toEqual({
        x: 10,
        y: 20,
      });
    });

    it('pulls a negative position back to the page edge', () => {
      expect(clampElement(textElement, page, { x: -8, y: -3 })).toEqual({
        x: 0,
        y: 0,
      });
    });

    it('stops an element short of the right and bottom edges', () => {
      expect(clampElement(textElement, page, { x: 999, y: 999 })).toEqual({
        x: page.widthMm - 30,
        y: page.heightMm - 5.2,
      });
    });

    it('clamps to the origin when the element is larger than the page', () => {
      const oversized = { ...textElement, width: 200 } as DocElement;

      expect(clampElement(oversized, page, { x: 5, y: 5 }).x).toBe(0);
    });
  });

  describe('elementContent', () => {
    it('reads the editable value of each content-bearing type', () => {
      expect(elementContent(textElement)).toBe('BVRI');
      expect(elementContent(barcodeElement)).toBe('BVRI-0001');
      expect(elementContent(careElement)).toBe('면 100%');
    });

    it('returns null for purely structural elements', () => {
      expect(
        elementContent({
          type: 'divider',
          id: 'rule',
          labelKey: 'field_divider',
          x: 0,
          y: 0,
          width: 20,
        }),
      ).toBeNull();
    });
  });

  describe('withContent', () => {
    it('writes back to the field that matches the element type', () => {
      expect(withContent(textElement, 'ACME')).toMatchObject({ text: 'ACME' });
      expect(withContent(barcodeElement, 'NEW-SKU')).toMatchObject({
        value: 'NEW-SKU',
      });
      expect(withContent(careElement, '울 100%')).toMatchObject({
        composition: '울 100%',
      });
    });

    it('does not mutate the original element', () => {
      const updated = withContent(textElement, 'ACME');

      expect(textElement.text).toBe('BVRI');
      expect(updated).not.toBe(textElement);
    });

    it('leaves a structural element unchanged', () => {
      const divider: DocElement = {
        type: 'divider',
        id: 'rule',
        labelKey: 'field_divider',
        x: 0,
        y: 0,
        width: 20,
      };

      expect(withContent(divider, 'ignored')).toBe(divider);
    });
  });
});
