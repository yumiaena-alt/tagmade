/**
 * The open document, its selection, and every mutation the studio performs.
 *
 * Both editing surfaces write here: the layer inputs in the left panel and
 * direct manipulation on the canvas. There is one copy of the truth, so a drag
 * on the canvas and a keystroke in the panel can never disagree.
 */
import type { AddableType, DocElement, LabelDocument } from '@/utils/documentModel';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { withContent } from '@/utils/documentModel';
import { DEFAULT_TEMPLATE_ID, findTemplate } from '@/utils/templateCatalog';

function templateDocument(id: string): LabelDocument {
  return (
    findTemplate(id)?.document
    ?? findTemplate(DEFAULT_TEMPLATE_ID)!.document
  );
}

let elementCounter = 0;

/** Ids only need to be unique within a document. */
function nextElementId(type: string): string {
  elementCounter += 1;

  return `${type}-${elementCounter}`;
}

function blankElement(type: AddableType, doc: LabelDocument): DocElement {
  const id = nextElementId(type);
  const x = Math.min(4, doc.widthMm / 4);
  const y = Math.min(4, doc.heightMm / 4);

  switch (type) {
    case 'text':
      return {
        type: 'text',
        id,
        labelKey: 'field_text',
        x,
        y,
        width: Math.max(10, doc.widthMm - x * 2),
        fontSize: 2.6,
        text: '텍스트',
      };
    case 'rect':
      return {
        type: 'rect',
        id,
        labelKey: 'field_shape',
        x,
        y,
        width: Math.max(8, doc.widthMm / 2),
        height: Math.max(6, doc.heightMm / 4),
      };
    case 'divider':
      return {
        type: 'divider',
        id,
        labelKey: 'field_divider',
        x,
        y,
        width: Math.max(10, doc.widthMm - x * 2),
      };
    case 'barcode':
      return {
        type: 'barcode',
        id,
        labelKey: 'field_barcode',
        x,
        y,
        value: 'BVRI-0001',
        width: Math.min(32, doc.widthMm - x * 2),
        height: 9,
        showValue: true,
      };
    case 'careSymbols':
      return {
        type: 'careSymbols',
        id,
        labelKey: 'field_care_symbols',
        x,
        y,
        composition: '면 100%',
        glyphWidth: 4.3,
        gap: 0.7,
      };
    case 'qr':
      return {
        type: 'qr',
        id,
        labelKey: 'field_qr',
        x,
        y,
        url: 'https://example.com',
        size: Math.min(18, doc.widthMm - x * 2),
      };
    case 'image':
      return {
        type: 'image',
        id,
        labelKey: 'field_image',
        x,
        y,
        // Empty until a file is chosen; the renderers draw a drop slot.
        src: '',
        width: Math.min(20, doc.widthMm - x * 2),
        height: Math.min(20, doc.heightMm - y * 2),
      };
    default:
      throw new Error(`Unsupported element type: ${type}`);
  }
}

type DocumentStore = {
  readonly doc: LabelDocument;
  /** Currently selected element id, or null when nothing is selected. */
  readonly selectedId: string | null;
  /** Replaces the document with a template preset. */
  readonly applyTemplate: (templateId: string) => void;
  readonly select: (id: string | null) => void;
  /** Merges a partial change into one element. */
  readonly updateElement: (id: string, patch: Partial<DocElement>) => void;
  /** Convenience for the layer inputs: sets whatever the element's content is. */
  readonly setElementContent: (id: string, content: string) => void;
  readonly moveElement: (id: string, position: { x: number; y: number }) => void;
  readonly addElement: (type: AddableType) => void;
  readonly removeElement: (id: string) => void;
  readonly resizePage: (widthMm: number, heightMm: number) => void;
};

export const useDocumentStore = create<DocumentStore>()(
  persist(
    set => ({
      doc: templateDocument(DEFAULT_TEMPLATE_ID),
      selectedId: null,

      applyTemplate: templateId =>
        set({ doc: templateDocument(templateId), selectedId: null }),

      select: id => set({ selectedId: id }),

      updateElement: (id, patch) =>
        set(state => ({
          doc: {
            ...state.doc,
            elements: state.doc.elements.map(element =>
              element.id === id
                ? ({ ...element, ...patch } as DocElement)
                : element,
            ),
          },
        })),

      setElementContent: (id, content) =>
        set(state => ({
          doc: {
            ...state.doc,
            elements: state.doc.elements.map(element =>
              element.id === id ? withContent(element, content) : element,
            ),
          },
        })),

      moveElement: (id, position) =>
        set(state => ({
          doc: {
            ...state.doc,
            elements: state.doc.elements.map(element =>
              element.id === id ? { ...element, ...position } : element,
            ),
          },
        })),

      addElement: type =>
        set((state) => {
          const element = blankElement(type, state.doc);

          return {
            doc: {
              ...state.doc,
              elements: [...state.doc.elements, element],
            },
            selectedId: element.id,
          };
        }),

      removeElement: id =>
        set(state => ({
          doc: {
            ...state.doc,
            elements: state.doc.elements.filter(element => element.id !== id),
          },
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),

      resizePage: (widthMm, heightMm) =>
        set(state => ({
          doc: {
            ...state.doc,
            widthMm: Math.max(5, widthMm),
            heightMm: Math.max(5, heightMm),
          },
        })),
    }),
    {
      name: 'smart-label-document-store',
      // Selection is per-session; only the document is worth restoring.
      partialize: state => ({ doc: state.doc }),
      merge: (persisted, current) => {
        const saved = persisted as { doc?: LabelDocument } | undefined;
        const doc = saved?.doc;
        const isUsable
          = doc
            && typeof doc.widthMm === 'number'
            && typeof doc.heightMm === 'number'
            && Array.isArray(doc.elements);

        return { ...current, doc: isUsable ? doc : current.doc };
      },
    },
  ),
);
