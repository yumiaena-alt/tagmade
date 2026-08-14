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

  describe('duplicateElement', () => {
    it('adds a copy and selects it, leaving the original alone', () => {
      const before = elements().length;
      const original = elements().find(e => e.id === 'brand')!;

      store().duplicateElement('brand');

      const copy = elements().at(-1)!;

      expect(elements()).toHaveLength(before + 1);
      expect(store().selectedId).toBe(copy.id);
      expect(copy.id).not.toBe('brand');
      expect(elements().find(e => e.id === 'brand')).toEqual(original);
    });

    it('offsets the copy so it is not hidden behind the original', () => {
      const original = elements().find(e => e.id === 'brand')!;

      store().duplicateElement('brand');

      const copy = elements().at(-1)!;

      expect(copy.x).toBeGreaterThan(original.x);
      expect(copy.y).toBeGreaterThan(original.y);
    });

    it('carries the properties over', () => {
      store().updateElement('brand', { fontSize: 7, bold: true });
      store().duplicateElement('brand');

      expect(elements().at(-1)).toMatchObject({
        fontSize: 7,
        bold: true,
        text: 'BVRI',
      });
    });

    it('keeps the copy on the page', () => {
      store().moveElement('brand', { x: 99, y: 99 });
      store().duplicateElement('brand');

      const copy = elements().at(-1)!;

      expect(copy.x).toBeLessThanOrEqual(store().doc.widthMm);
      expect(copy.y).toBeLessThanOrEqual(store().doc.heightMm);
    });

    it('copies onto the page being edited, not the first one', () => {
      store().addPage();
      store().addElement('qr');
      const id = store().selectedId!;

      store().duplicateElement(id);

      expect(store().doc.pages[0]!.elements.some(e => e.type === 'qr')).toBe(false);
      expect(store().doc.pages[1]!.elements).toHaveLength(2);
    });

    it('ignores an id that is not on this page', () => {
      const before = elements().length;

      store().duplicateElement('does-not-exist');

      expect(elements()).toHaveLength(before);
    });

    it('is a single undo', () => {
      const before = elements().length;

      store().duplicateElement('brand');
      store().undo();

      expect(elements()).toHaveLength(before);
    });
  });

  describe('nudgeElement', () => {
    it('shifts an element by the delta', () => {
      const before = elements().find(e => e.id === 'brand')!;

      store().nudgeElement('brand', { x: 1, y: -1 });

      expect(elements().find(e => e.id === 'brand')).toMatchObject({
        x: before.x + 1,
        y: before.y - 1,
      });
    });

    it('holds the element inside the page', () => {
      store().nudgeElement('brand', { x: -999, y: -999 });

      const moved = elements().find(e => e.id === 'brand')!;

      expect(moved.x).toBeGreaterThanOrEqual(0);
      expect(moved.y).toBeGreaterThanOrEqual(0);
    });

    it('collapses a run of taps into one undo', () => {
      // Down the page, where a 25mm-wide field on a 30mm page has room to
      // move — sideways it hits the clamp after 2.5mm.
      const before = elements().find(e => e.id === 'brand')!;

      store().nudgeElement('brand', { x: 0, y: 1 });
      store().nudgeElement('brand', { x: 0, y: 1 });
      store().nudgeElement('brand', { x: 0, y: 1 });

      expect(elements().find(e => e.id === 'brand')?.y).toBe(before.y + 3);

      store().undo();

      expect(elements().find(e => e.id === 'brand')?.y).toBe(before.y);
    });

    it('stops at the page edge rather than running past it', () => {
      // 25mm wide on a 30mm page leaves exactly 5mm of travel.
      store().nudgeElement('brand', { x: 1, y: 0 });
      store().nudgeElement('brand', { x: 1, y: 0 });
      store().nudgeElement('brand', { x: 1, y: 0 });

      expect(elements().find(e => e.id === 'brand')?.x).toBe(5);
    });

    it('refuses to move a locked element', () => {
      store().toggleElementLock('brand');
      const locked = elements().find(e => e.id === 'brand')!;

      store().nudgeElement('brand', { x: 5, y: 5 });

      expect(elements().find(e => e.id === 'brand')).toMatchObject({
        x: locked.x,
        y: locked.y,
      });
    });

    it('ignores an id that is not on this page', () => {
      const before = elements().map(e => ({ ...e }));

      store().nudgeElement('does-not-exist', { x: 1, y: 1 });

      expect(elements()).toEqual(before);
    });

    it('moves only the element addressed', () => {
      const other = elements().find(e => e.id === 'sku')!;

      store().nudgeElement('brand', { x: 2, y: 2 });

      expect(elements().find(e => e.id === 'sku')).toEqual(other);
    });
  });

  describe('locking and hiding', () => {
    it('locks and unlocks an element', () => {
      store().toggleElementLock('brand');

      expect(elements().find(e => e.id === 'brand')?.locked).toBe(true);

      store().toggleElementLock('brand');

      expect(elements().find(e => e.id === 'brand')?.locked).toBe(false);
    });

    it('hides and shows an element', () => {
      store().toggleElementHidden('brand');

      expect(elements().find(e => e.id === 'brand')?.hidden).toBe(true);

      store().toggleElementHidden('brand');

      expect(elements().find(e => e.id === 'brand')?.hidden).toBe(false);
    });

    it('keeps a hidden element in the page so it can be brought back', () => {
      const before = elements().length;

      store().toggleElementHidden('brand');

      expect(elements()).toHaveLength(before);
    });

    it('drops the selection when the selected element is locked', () => {
      store().select('brand');
      store().toggleElementLock('brand');

      expect(store().selectedId).toBeNull();
    });

    it('drops the selection when the selected element is hidden', () => {
      store().select('brand');
      store().toggleElementHidden('brand');

      expect(store().selectedId).toBeNull();
    });

    it('leaves a different selection alone', () => {
      store().select('sku');
      store().toggleElementLock('brand');

      expect(store().selectedId).toBe('sku');
    });

    it('is undoable', () => {
      store().toggleElementHidden('brand');
      store().undo();

      expect(elements().find(e => e.id === 'brand')?.hidden).toBeFalsy();
    });

    it('touches only the page being edited', () => {
      store().duplicatePage();
      store().selectPage(0);
      const copyId = store().doc.pages[1]!.elements[0]!.id;

      store().toggleElementHidden('brand');

      expect(store().doc.pages[1]!.elements.find(e => e.id === copyId)?.hidden)
        .toBeFalsy();
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

    it('names a page', () => {
      store().setPageName(0, '앞면');

      expect(store().doc.pages[0]!.name).toBe('앞면');
    });

    it('keeps a cleared name as an empty one', () => {
      store().setPageName(0, '앞면');
      store().setPageName(0, '');

      // Empty rather than absent: the strip reads either as "use the number".
      expect(store().doc.pages[0]!.name).toBe('');
    });

    it('names pages independently', () => {
      store().addPage();
      store().setPageName(0, '앞면');
      store().setPageName(1, '뒷면');

      expect(store().doc.pages.map(page => page.name)).toEqual(['앞면', '뒷면']);
    });

    it('keeps a name with the page it belongs to when the order changes', () => {
      store().addPage();
      store().setPageName(0, '앞면');
      store().setPageName(1, '뒷면');
      store().movePage(1, 'backward');

      expect(store().doc.pages.map(page => page.name)).toEqual(['뒷면', '앞면']);
    });

    it('undoes a rename', () => {
      store().setPageName(0, '앞면');
      store().undo();

      expect(store().doc.pages[0]!.name).toBeUndefined();
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
