// Runs in the browser project: the persist middleware needs a real localStorage.
import { beforeEach, describe, expect, it } from 'vitest';
import { pageAt } from '@/utils/documentModel';
import { findTemplate } from '@/utils/templateCatalog';
import { useDocumentStore } from './useDocumentStore';

const STORAGE_KEY = 'smart-label-document-store';

function reset() {
  localStorage.removeItem(STORAGE_KEY);
  useDocumentStore.getState().applyTemplate('care-label-standard');
  // Applying the template is itself an undoable change, so clear the stacks to
  // give each test a clean history.
  useDocumentStore.setState({ past: [], future: [] });
}

const store = () => useDocumentStore.getState();

/** The page being edited — what every element action here applies to. */
const elements = () => pageAt(store().doc, store().activePageIndex).elements;

describe('useDocumentStore', () => {
  beforeEach(reset);

  describe('applyTemplate', () => {
    it('replaces the document with the template preset', () => {
      store().applyTemplate('hang-tag-minimal');

      const template = findTemplate('hang-tag-minimal')!;

      expect(store().doc.templateId).toBe('hang-tag-minimal');
      expect(store().doc.widthMm).toBe(template.document.widthMm);
      expect(elements()).toHaveLength(template.document.pages[0]!.elements.length);
    });

    it('discards elements added to the previous document', () => {
      store().addElement('text');
      const grown = elements().length;

      store().applyTemplate('care-label-standard');

      expect(elements().length).toBeLessThan(grown);
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

      expect(elements()).toEqual([]);
    });
  });

  describe('addElement', () => {
    it('appends the new element and selects it', () => {
      const before = elements().length;

      store().addElement('barcode');

      expect(elements()).toHaveLength(before + 1);
      expect(store().selectedId).toBe(elements().at(-1)!.id);
      expect(elements().at(-1)!.type).toBe('barcode');
    });

    it('gives each added element a distinct id', () => {
      store().addElement('text');
      store().addElement('text');

      const ids = elements().map(element => element.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps a new element inside the page', () => {
      store().applyTemplate('kc-mark-micro');
      store().addElement('qr');

      const added = elements().at(-1)!;

      expect(added.x).toBeLessThan(store().doc.widthMm);
      expect(added.y).toBeLessThan(store().doc.heightMm);
    });
  });

  describe('editing', () => {
    it('sets content on the addressed element only', () => {
      store().setElementContent('brand', 'ACME');

      expect(elements().find(e => e.id === 'brand')).toMatchObject({
        text: 'ACME',
      });
      expect(elements().find(e => e.id === 'sku')).toMatchObject({
        value: 'BVRI-2026-TS-S',
      });
    });

    it('moves one element without touching the others', () => {
      const otherBefore = elements().find(e => e.id === 'sku');

      store().moveElement('brand', { x: 9, y: 40 });

      expect(elements().find(e => e.id === 'brand')).toMatchObject({
        x: 9,
        y: 40,
      });
      expect(elements().find(e => e.id === 'sku')).toEqual(otherBefore);
    });

    it('merges a property patch into an element', () => {
      store().updateElement('brand', { fontSize: 9, bold: false });

      expect(elements().find(e => e.id === 'brand')).toMatchObject({
        fontSize: 9,
        bold: false,
        text: 'BVRI',
      });
    });

    it('removes an element and drops its selection', () => {
      store().select('brand');
      store().removeElement('brand');

      expect(elements().some(e => e.id === 'brand')).toBe(false);
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

  describe('history', () => {
    it('starts with nothing to undo or redo', () => {
      expect(store().past).toHaveLength(0);
      expect(store().future).toHaveLength(0);
    });

    it('undoes an element removal', () => {
      const before = elements().length;

      store().removeElement('brand');
      store().undo();

      expect(elements()).toHaveLength(before);
      expect(elements().some(e => e.id === 'brand')).toBe(true);
    });

    it('redoes what was undone', () => {
      store().removeElement('brand');
      store().undo();
      store().redo();

      expect(elements().some(e => e.id === 'brand')).toBe(false);
    });

    it('undoes a page resize', () => {
      store().resizePage(64, 48);
      store().undo();

      expect(store().doc.widthMm).toBe(30);
      expect(store().doc.heightMm).toBe(70);
    });

    it('undoes a template swap', () => {
      store().applyTemplate('hang-tag-minimal');
      store().undo();

      expect(store().doc.templateId).toBe('care-label-standard');
    });

    it('collapses a run of edits to the same field into one undo', () => {
      store().setElementContent('brand', 'A');
      store().setElementContent('brand', 'AB');
      store().setElementContent('brand', 'ABC');
      store().undo();

      expect(elements().find(e => e.id === 'brand')).toMatchObject({
        text: 'BVRI',
      });
    });

    it('keeps separate fields separately undoable', () => {
      store().setElementContent('brand', 'ACME');
      store().setElementContent('sku', 'NEW-SKU');
      store().undo();

      expect(elements().find(e => e.id === 'sku')).toMatchObject({
        value: 'BVRI-2026-TS-S',
      });
      expect(elements().find(e => e.id === 'brand')).toMatchObject({
        text: 'ACME',
      });
    });

    it('clears the redo stack once a new change is made', () => {
      store().removeElement('brand');
      store().undo();

      expect(store().future).toHaveLength(1);

      store().removeElement('sku');

      expect(store().future).toHaveLength(0);
    });

    it('does nothing when there is no history', () => {
      const before = store().doc;

      store().undo();
      store().redo();

      expect(store().doc).toBe(before);
    });

    it('drops a selection the restored document no longer has', () => {
      store().addElement('text');
      const addedId = store().selectedId;

      expect(addedId).not.toBeNull();

      store().undo();

      expect(store().selectedId).toBeNull();
    });
  });

  describe('pages', () => {
    it('starts a template on a single page', () => {
      expect(store().doc.pages).toHaveLength(1);
      expect(store().activePageIndex).toBe(0);
    });

    it('adds an empty page after the active one and shows it', () => {
      store().addPage();

      expect(store().doc.pages).toHaveLength(2);
      expect(store().activePageIndex).toBe(1);
      expect(elements()).toEqual([]);
    });

    it('gives every page a distinct id', () => {
      store().addPage();
      store().addPage();
      store().duplicatePage();

      const ids = store().doc.pages.map(page => page.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('leaves the other pages alone when an element is added', () => {
      const before = elements().length;

      store().addPage();
      store().addElement('text');

      expect(store().doc.pages[0]!.elements).toHaveLength(before);
      expect(store().doc.pages[1]!.elements).toHaveLength(1);
    });

    it('edits only the page on screen', () => {
      store().duplicatePage();
      store().selectPage(0);
      store().setElementContent('brand', 'FRONT');

      expect(store().doc.pages[0]!.elements.find(e => e.id === 'brand'))
        .toMatchObject({ text: 'FRONT' });
      expect(store().doc.pages[1]!.elements.find(
        e => e.type === 'text' && e.text === 'FRONT',
      )).toBeUndefined();
    });

    it('duplicates the active page with its elements', () => {
      const before = elements().length;

      store().duplicatePage();

      expect(store().doc.pages).toHaveLength(2);
      expect(store().activePageIndex).toBe(1);
      expect(elements()).toHaveLength(before);
    });

    it('re-ids the elements of a duplicated page', () => {
      const original = elements().map(element => element.id);

      store().duplicatePage();

      const copied = elements().map(element => element.id);

      expect(copied).toHaveLength(original.length);
      expect(copied.some(id => original.includes(id))).toBe(false);
    });

    it('refuses to remove the only page', () => {
      store().removePage(0);

      expect(store().doc.pages).toHaveLength(1);
    });

    it('pulls the active page back into range after a removal', () => {
      store().addPage();

      expect(store().activePageIndex).toBe(1);

      store().removePage(1);

      expect(store().doc.pages).toHaveLength(1);
      expect(store().activePageIndex).toBe(0);
    });

    it('clears the selection when another page is shown', () => {
      store().addPage();
      store().addElement('text');

      expect(store().selectedId).not.toBeNull();

      store().selectPage(0);

      expect(store().selectedId).toBeNull();
    });

    it('ignores a page index that does not exist', () => {
      store().selectPage(4);

      expect(store().activePageIndex).toBe(0);
    });

    it('moves a page through the print order and follows it', () => {
      store().addPage();
      store().addElement('qr');

      const movedId = store().doc.pages[1]!.id;

      store().movePage(1, 'backward');

      expect(store().doc.pages[0]!.id).toBe(movedId);
      expect(store().activePageIndex).toBe(0);
    });

    it('refuses to move a page past the ends', () => {
      store().addPage();
      store().movePage(1, 'forward');

      expect(store().doc.pages).toHaveLength(2);
      expect(store().activePageIndex).toBe(1);
    });

    it('undoes adding a page', () => {
      store().addPage();
      store().undo();

      expect(store().doc.pages).toHaveLength(1);
      expect(store().activePageIndex).toBe(0);
    });

    it('undoes removing a page, elements and all', () => {
      store().duplicatePage();
      const copied = elements().length;

      store().removePage(1);
      store().undo();

      expect(store().doc.pages).toHaveLength(2);
      expect(store().doc.pages[1]!.elements).toHaveLength(copied);
    });
  });

  describe('persistence', () => {
    it('writes the document to local storage', () => {
      store().setElementContent('brand', 'PERSISTED');

      const raw = localStorage.getItem(STORAGE_KEY);

      expect(raw).toBeTruthy();
      expect(JSON.parse(raw ?? '{}').state.doc.pages[0].elements).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'PERSISTED' })]),
      );
    });

    it('does not persist the transient selection', () => {
      store().select('brand');
      store().setElementContent('brand', 'X');

      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');

      expect(parsed.state.selectedId).toBeUndefined();
    });

    it('reopens a document saved before multi-page as one page', async () => {
      // Exactly what a browser that last ran the pre-pages build left behind.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 0,
          state: {
            doc: {
              templateId: 'custom-blank',
              widthMm: 50,
              heightMm: 50,
              elements: [{
                type: 'text',
                id: 'kept',
                labelKey: 'field_text',
                x: 1,
                y: 1,
                width: 20,
                fontSize: 3,
                text: 'OLD WORK',
              }],
            },
          },
        }),
      );

      await useDocumentStore.persist.rehydrate();

      expect(store().doc.pages).toHaveLength(1);
      expect(elements()).toHaveLength(1);
      expect(elements()[0]).toMatchObject({ text: 'OLD WORK' });
    });
  });
});
