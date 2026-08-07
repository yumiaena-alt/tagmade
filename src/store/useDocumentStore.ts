/**
 * The open document, its selection, its undo history, and every mutation the
 * studio performs.
 *
 * Both editing surfaces write here: the layer inputs in the left panel and
 * direct manipulation on the canvas. There is one copy of the truth, so a drag
 * on the canvas and a keystroke in the panel can never disagree — and because
 * every change funnels through `commit`, undo covers all of them for free.
 */
import type { AddableType, DocElement, LabelDocument } from '@/utils/documentModel';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { withContent } from '@/utils/documentModel';
import { DEFAULT_TEMPLATE_ID, findTemplate } from '@/utils/templateCatalog';

/** Depth of the undo stack. Documents are small, so this is cheap. */
const MAX_HISTORY = 60;

/**
 * Consecutive edits of the same thing inside this window collapse into one
 * history entry, so typing a brand name is one undo rather than one per letter.
 */
const COALESCE_MS = 700;

function templateDocument(id: string): LabelDocument {
  return findTemplate(id)?.document ?? findTemplate(DEFAULT_TEMPLATE_ID)!.document;
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
  readonly past: readonly LabelDocument[];
  readonly future: readonly LabelDocument[];
  /** Replaces the document with a template preset. */
  readonly applyTemplate: (templateId: string) => void;
  /**
   * Replaces the document with an imported one. Validation belongs to the
   * caller (`parseDocument`) — by the time it lands here it is already a
   * document the renderers can draw.
   */
  readonly loadDocument: (doc: LabelDocument) => void;
  readonly select: (id: string | null) => void;
  /** Merges a partial change into one element. */
  readonly updateElement: (id: string, patch: Partial<DocElement>) => void;
  /** Convenience for the layer inputs: sets whatever the element's content is. */
  readonly setElementContent: (id: string, content: string) => void;
  readonly moveElement: (id: string, position: { x: number; y: number }) => void;
  readonly addElement: (type: AddableType) => void;
  readonly removeElement: (id: string) => void;
  readonly resizePage: (widthMm: number, heightMm: number) => void;
  readonly undo: () => void;
  readonly redo: () => void;
};

type HistoryState = Pick<DocumentStore, 'doc' | 'past' | 'future'>;

/** Identifies what is being edited, so repeats of it can coalesce. */
let lastCommit: { key: string; at: number } | null = null;

/**
 * Produces the next document plus history.
 *
 * @param state Current document and stacks.
 * @param nextDoc The document after the change.
 * @param coalesceKey When the previous commit shared this key and happened
 * within `COALESCE_MS`, the change amends the last history entry instead of
 * adding one. Omit it for discrete actions that should always be undoable.
 */
function commit(
  state: HistoryState,
  nextDoc: LabelDocument,
  coalesceKey?: string,
): HistoryState {
  const now = Date.now();
  const shouldCoalesce
    = coalesceKey !== undefined
      && lastCommit !== null
      && lastCommit.key === coalesceKey
      && now - lastCommit.at < COALESCE_MS;

  lastCommit = coalesceKey === undefined ? null : { key: coalesceKey, at: now };

  return {
    doc: nextDoc,
    // Coalescing keeps the older snapshot, so undo jumps to before the run of
    // edits rather than stepping through each keystroke.
    past: shouldCoalesce
      ? state.past
      : [...state.past, state.doc].slice(-MAX_HISTORY),
    future: [],
  };
}

/** Drops a selection that the restored document no longer contains. */
function keepSelection(doc: LabelDocument, selectedId: string | null) {
  return doc.elements.some(element => element.id === selectedId)
    ? selectedId
    : null;
}

function mapElements(
  doc: LabelDocument,
  change: (element: DocElement) => DocElement,
): LabelDocument {
  return { ...doc, elements: doc.elements.map(change) };
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    set => ({
      doc: templateDocument(DEFAULT_TEMPLATE_ID),
      selectedId: null,
      past: [],
      future: [],

      applyTemplate: templateId =>
        set(state => ({
          ...commit(state, templateDocument(templateId)),
          selectedId: null,
        })),

      loadDocument: doc =>
        set(state => ({
          ...commit(state, doc),
          selectedId: null,
        })),

      select: id => set({ selectedId: id }),

      updateElement: (id, patch) =>
        set(state =>
          commit(
            state,
            mapElements(state.doc, element =>
              element.id === id ? ({ ...element, ...patch } as DocElement) : element),
            `update:${id}:${Object.keys(patch).join(',')}`,
          )),

      setElementContent: (id, content) =>
        set(state =>
          commit(
            state,
            mapElements(state.doc, element =>
              element.id === id ? withContent(element, content) : element),
            `content:${id}`,
          )),

      moveElement: (id, position) =>
        set(state =>
          commit(
            state,
            mapElements(state.doc, element =>
              element.id === id ? { ...element, ...position } : element),
          )),

      addElement: type =>
        set((state) => {
          const element = blankElement(type, state.doc);

          return {
            ...commit(state, {
              ...state.doc,
              elements: [...state.doc.elements, element],
            }),
            selectedId: element.id,
          };
        }),

      removeElement: id =>
        set(state => ({
          ...commit(state, {
            ...state.doc,
            elements: state.doc.elements.filter(element => element.id !== id),
          }),
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),

      resizePage: (widthMm, heightMm) =>
        set(state =>
          commit(
            state,
            {
              ...state.doc,
              widthMm: Math.max(5, widthMm),
              heightMm: Math.max(5, heightMm),
            },
            'resizePage',
          )),

      undo: () =>
        set((state) => {
          const previous = state.past.at(-1);

          if (!previous) {
            return state;
          }

          lastCommit = null;

          return {
            doc: previous,
            past: state.past.slice(0, -1),
            future: [state.doc, ...state.future].slice(0, MAX_HISTORY),
            selectedId: keepSelection(previous, state.selectedId),
          };
        }),

      redo: () =>
        set((state) => {
          const [next, ...rest] = state.future;

          if (!next) {
            return state;
          }

          lastCommit = null;

          return {
            doc: next,
            past: [...state.past, state.doc].slice(-MAX_HISTORY),
            future: rest,
            selectedId: keepSelection(next, state.selectedId),
          };
        }),
    }),
    {
      name: 'smart-label-document-store',
      // Selection and history are per-session; only the document is restored.
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
