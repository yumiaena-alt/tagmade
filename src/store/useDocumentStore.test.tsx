// Runs in the browser project: the persist middleware needs a real localStorage.
import { beforeEach, describe, expect, it } from 'vitest';
import { findTemplate } from '@/utils/templateCatalog';
import { useDocumentStore } from './useDocumentStore';

const STORAGE_KEY = 'smart-label-document-store';

function reset() {
  localStorage.removeItem(STORAGE_KEY);
  useDocumentStore.getState().applyTemplate('care-label-standard');
}

const store = () => useDocumentStore.getState();

describe('useDocumentStore', () => {
  beforeEach(reset);

  describe('applyTemplate', () => {
    it('replaces the document with the template preset', () => {
      store().applyTemplate('hang-tag-minimal');

      const template = findTemplate('hang-tag-minimal')!;

      expect(store().doc.templateId).toBe('hang-tag-minimal');
      expect(store().doc.widthMm).toBe(template.document.widthMm);
      expect(store().doc.elements).toHaveLength(template.document.elements.length);
    });

    it('discards elements added to the previous document', () => {
      store().addElement('text');
      const grown = store().doc.elements.length;

      store().applyTemplate('care-label-standard');

      expect(store().doc.elements.length).toBeLessThan(grown);
    });

    it('clears the selection', () => {
      store().addElement('text');

      expect(store().selectedId).not.toBeNull();

      store().applyTemplate('custom-blank');

      expect(store().selectedId).toBeNull();
    });

    it('falls back to the default template for an unknown id', () => {
      store().applyTemplate('does-not-exist');

      expect(store().doc.templateId).toBe('care-label-standard');
    });

    it('loads the blank canvas with no elements', () => {
      store().applyTemplate('custom-blank');

      expect(store().doc.elements).toEqual([]);
    });
  });

  describe('addElement', () => {
    it('appends the new element and selects it', () => {
      const before = store().doc.elements.length;

      store().addElement('barcode');

      expect(store().doc.elements).toHaveLength(before + 1);
      expect(store().selectedId).toBe(store().doc.elements.at(-1)!.id);
      expect(store().doc.elements.at(-1)!.type).toBe('barcode');
    });

    it('gives each added element a distinct id', () => {
      store().addElement('text');
      store().addElement('text');

      const ids = store().doc.elements.map(element => element.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps a new element inside the page', () => {
      store().applyTemplate('kc-mark-micro');
      store().addElement('qr');

      const added = store().doc.elements.at(-1)!;

      expect(added.x).toBeLessThan(store().doc.widthMm);
      expect(added.y).toBeLessThan(store().doc.heightMm);
    });
  });

  describe('editing', () => {
    it('sets content on the addressed element only', () => {
      store().setElementContent('brand', 'ACME');

      expect(store().doc.elements.find(e => e.id === 'brand')).toMatchObject({
        text: 'ACME',
      });
      expect(store().doc.elements.find(e => e.id === 'sku')).toMatchObject({
        value: 'BVRI-2026-TS-S',
      });
    });

    it('moves one element without touching the others', () => {
      const otherBefore = store().doc.elements.find(e => e.id === 'sku');

      store().moveElement('brand', { x: 9, y: 40 });

      expect(store().doc.elements.find(e => e.id === 'brand')).toMatchObject({
        x: 9,
        y: 40,
      });
      expect(store().doc.elements.find(e => e.id === 'sku')).toEqual(otherBefore);
    });

    it('merges a property patch into an element', () => {
      store().updateElement('brand', { fontSize: 9, bold: false });

      expect(store().doc.elements.find(e => e.id === 'brand')).toMatchObject({
        fontSize: 9,
        bold: false,
        text: 'BVRI',
      });
    });

    it('removes an element and drops its selection', () => {
      store().select('brand');
      store().removeElement('brand');

      expect(store().doc.elements.some(e => e.id === 'brand')).toBe(false);
      expect(store().selectedId).toBeNull();
    });

    it('keeps the selection when a different element is removed', () => {
      store().select('brand');
      store().removeElement('sku');

      expect(store().selectedId).toBe('brand');
    });
  });

  describe('resizePage', () => {
    it('applies a new page size', () => {
      store().resizePage(64, 48);

      expect(store().doc.widthMm).toBe(64);
      expect(store().doc.heightMm).toBe(48);
    });

    it('refuses a collapsed page', () => {
      store().resizePage(0, -10);

      expect(store().doc.widthMm).toBeGreaterThanOrEqual(5);
      expect(store().doc.heightMm).toBeGreaterThanOrEqual(5);
    });
  });

  describe('persistence', () => {
    it('writes the document to local storage', () => {
      store().setElementContent('brand', 'PERSISTED');

      const raw = localStorage.getItem(STORAGE_KEY);

      expect(raw).toBeTruthy();
      expect(JSON.parse(raw ?? '{}').state.doc.elements).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'PERSISTED' })]),
      );
    });

    it('does not persist the transient selection', () => {
      store().select('brand');
      store().setElementContent('brand', 'X');

      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');

      expect(parsed.state.selectedId).toBeUndefined();
    });
  });
});
