/**
 * The open document, its selection, its undo history, and every mutation the
 * studio performs.
 *
 * Both editing surfaces write here: the layer inputs in the left panel and
 * direct manipulation on the canvas. There is one copy of the truth, so a drag
 * on the canvas and a keystroke in the panel can never disagree — and because
 * every change funnels through `commit`, undo covers all of them for free.
 */
import type {
  AddableType,
  DocElement,
  FlatDocument,
  LabelDocument,
  LabelPage,
} from '@/utils/documentModel';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clampElement, pageAt, toPagedDocument, withContent } from '@/utils/documentModel';
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

/**
 * Id for a page about to be added.
 *
 * Derived from what the document already holds rather than a module counter, so
 * a document restored from storage or a file cannot collide with it.
 */
function nextPageId(doc: LabelDocument): string {
  const used = new Set(doc.pages.map(page => page.id));
  let n = doc.pages.length + 1;

  while (used.has(`page-${n}`)) {
    n += 1;
  }

  return `page-${n}`;
}

type DocumentStore = {
  readonly doc: LabelDocument;
  /** Which page the canvas is showing and every element action applies to. */
  readonly activePageIndex: number;
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
  /**
   * Adds an image already read as a data URL, at a point on the page.
   *
   * One action rather than add-then-set-src, so a dropped file is a single
   * undo step and never lands as an empty slot the operator has to fill.
   */
  readonly addImage: (src: string, position: { x: number; y: number }) => void;
  /** Adds a care-symbol block for a composition, at the usual offset. */
  readonly addCareSymbols: (composition: string) => void;
  readonly removeElement: (id: string) => void;
  /**
   * Moves an element one place through the draw order.
   *
   * The array *is* the stacking order — later entries paint over earlier
   * ones — so bringing something forward is a swap with its neighbour.
   */
  readonly reorderElement: (id: string, direction: 'forward' | 'backward') => void;
  readonly resizePage: (widthMm: number, heightMm: number) => void;
  /**
   * Shows a page. Not an edit, so it stays out of the history — stepping back
   * through pages you merely looked at would bury the change you meant to undo.
   */
  readonly selectPage: (index: number) => void;
  /** Appends an empty page after the active one and shows it. */
  readonly addPage: () => void;
  /**
   * Copies the active page in after itself and shows the copy.
   *
   * The copied elements are given fresh ids: two pages sharing an id would make
   * "the selected element" ambiguous the moment a page is reordered.
   */
  readonly duplicatePage: () => void;
  /** Removes a page. Refused for the last one — a document must have a page. */
  readonly removePage: (index: number) => void;
  /** Moves a page one place through the print order. */
  readonly movePage: (index: number, direction: 'forward' | 'backward') => void;
  /**
   * Names a page. An empty name is kept as one, so clearing the field puts the
   * page back to being known by its number.
   */
  readonly setPageName: (index: number, name: string) => void;
  readonly setBackground: (color: string) => void;
  readonly setDocumentName: (name: string) => void;
  /**
   * Points the document at the template entry that now records it, and takes
   * the name that entry was filed under.
   *
   * Deliberately outside the history: which entry the canvas is being recorded
   * into is bookkeeping, not an edit, and undoing a colour change must not
   * silently detach the document from its own template — nor should undo have
   * to step back through a name the machine chose.
   */
  readonly adoptRecord: (templateId: string, name: string) => void;
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

/**
 * Where to look after the document is replaced wholesale — by undo, redo, or an
 * import.
 *
 * The restored document may have fewer pages than the one on screen, and the
 * selected element may not exist on the page that survives, so both are pulled
 * back into range rather than left pointing at nothing.
 */
function restoreFocus(
  doc: LabelDocument,
  selectedId: string | null,
  activePageIndex: number,
): { selectedId: string | null; activePageIndex: number } {
  const index = Math.min(Math.max(activePageIndex, 0), doc.pages.length - 1);
  const isStillThere = pageAt(doc, index).elements.some(
    element => element.id === selectedId,
  );

  return { activePageIndex: index, selectedId: isStillThere ? selectedId : null };
}

/** Rewrites one page, leaving the rest of the document alone. */
function mapPage(
  doc: LabelDocument,
  index: number,
  change: (page: LabelPage) => LabelPage,
): LabelDocument {
  return {
    ...doc,
    pages: doc.pages.map((page, at) => (at === index ? change(page) : page)),
  };
}

/** Rewrites every element of the active page. */
function mapElements(
  doc: LabelDocument,
  index: number,
  change: (element: DocElement) => DocElement,
): LabelDocument {
  return mapPage(doc, index, page => ({
    ...page,
    elements: page.elements.map(change),
  }));
}

/** Appends to the active page, which is what every "add" action does. */
function addToPage(
  doc: LabelDocument,
  index: number,
  element: DocElement,
): LabelDocument {
  return mapPage(doc, index, page => ({
    ...page,
    elements: [...page.elements, element],
  }));
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    set => ({
      doc: templateDocument(DEFAULT_TEMPLATE_ID),
      activePageIndex: 0,
      selectedId: null,
      past: [],
      future: [],

      applyTemplate: templateId =>
        set(state => ({
          ...commit(state, templateDocument(templateId)),
          activePageIndex: 0,
          selectedId: null,
        })),

      loadDocument: doc =>
        set(state => ({
          ...commit(state, toPagedDocument(doc)),
          activePageIndex: 0,
          selectedId: null,
        })),

      select: id => set({ selectedId: id }),

      updateElement: (id, patch) =>
        set(state =>
          commit(
            state,
            mapElements(state.doc, state.activePageIndex, element =>
              element.id === id ? ({ ...element, ...patch } as DocElement) : element),
            `update:${id}:${Object.keys(patch).join(',')}`,
          )),

      setElementContent: (id, content) =>
        set(state =>
          commit(
            state,
            mapElements(state.doc, state.activePageIndex, element =>
              element.id === id ? withContent(element, content) : element),
            `content:${id}`,
          )),

      moveElement: (id, position) =>
        set(state =>
          commit(
            state,
            mapElements(state.doc, state.activePageIndex, element =>
              element.id === id ? { ...element, ...position } : element),
          )),

      addElement: type =>
        set((state) => {
          const element = blankElement(type, state.doc);

          return {
            ...commit(state, addToPage(state.doc, state.activePageIndex, element)),
            selectedId: element.id,
          };
        }),

      addImage: (src, position) =>
        set((state) => {
          const base = blankElement('image', state.doc);
          // Narrowed rather than cast: `blankElement` returns the union,
          // and only the image member carries `src`.
          const element: DocElement
            = base.type === 'image' ? { ...base, src } : base;
          const at = clampElement(element, state.doc, position);

          return {
            ...commit(
              state,
              addToPage(state.doc, state.activePageIndex, { ...element, ...at }),
            ),
            selectedId: element.id,
          };
        }),

      addCareSymbols: composition =>
        set((state) => {
          const base = blankElement('careSymbols', state.doc);
          const element: DocElement
            = base.type === 'careSymbols' ? { ...base, composition } : base;

          return {
            ...commit(state, addToPage(state.doc, state.activePageIndex, element)),
            selectedId: element.id,
          };
        }),

      removeElement: id =>
        set(state => ({
          ...commit(
            state,
            mapPage(state.doc, state.activePageIndex, page => ({
              ...page,
              elements: page.elements.filter(element => element.id !== id),
            })),
          ),
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),

      reorderElement: (id, direction) =>
        set((state) => {
          const current = pageAt(state.doc, state.activePageIndex).elements;
          const from = current.findIndex(item => item.id === id);
          const to = direction === 'forward' ? from + 1 : from - 1;

          if (from < 0 || to < 0 || to >= current.length) {
            return state;
          }

          const elements = [...current];
          const [moved] = elements.splice(from, 1);

          elements.splice(to, 0, moved!);

          return commit(
            state,
            mapPage(state.doc, state.activePageIndex, page => ({ ...page, elements })),
          );
        }),

      selectPage: index =>
        set((state) => {
          if (index < 0 || index >= state.doc.pages.length) {
            return state;
          }

          // The selection belongs to the page it was made on.
          return { activePageIndex: index, selectedId: null };
        }),

      addPage: () =>
        set((state) => {
          const at = state.activePageIndex + 1;
          const pages = [...state.doc.pages];

          pages.splice(at, 0, { id: nextPageId(state.doc), elements: [] });

          return {
            ...commit(state, { ...state.doc, pages }),
            activePageIndex: at,
            selectedId: null,
          };
        }),

      duplicatePage: () =>
        set((state) => {
          const source = pageAt(state.doc, state.activePageIndex);
          const at = state.activePageIndex + 1;
          const pages = [...state.doc.pages];

          pages.splice(at, 0, {
            id: nextPageId(state.doc),
            elements: source.elements.map(element => ({
              ...element,
              id: nextElementId(element.type),
            })),
          });

          return {
            ...commit(state, { ...state.doc, pages }),
            activePageIndex: at,
            selectedId: null,
          };
        }),

      removePage: index =>
        set((state) => {
          if (state.doc.pages.length < 2 || index < 0 || index >= state.doc.pages.length) {
            return state;
          }

          const pages = state.doc.pages.filter((_, at) => at !== index);

          return {
            ...commit(state, { ...state.doc, pages }),
            activePageIndex: Math.min(state.activePageIndex, pages.length - 1),
            selectedId: null,
          };
        }),

      setPageName: (index, name) =>
        set(state =>
          commit(
            state,
            mapPage(state.doc, index, page => ({ ...page, name })),
            `pageName:${index}`,
          )),

      movePage: (index, direction) =>
        set((state) => {
          const to = direction === 'forward' ? index + 1 : index - 1;

          if (index < 0 || to < 0 || to >= state.doc.pages.length) {
            return state;
          }

          const pages = [...state.doc.pages];
          const [moved] = pages.splice(index, 1);

          pages.splice(to, 0, moved!);

          return {
            ...commit(state, { ...state.doc, pages }),
            // Follow the page that moved, so a repeated click keeps shifting
            // the same one instead of whatever slid into its place.
            activePageIndex: state.activePageIndex === index ? to : state.activePageIndex,
          };
        }),

      setBackground: color =>
        set(state =>
          commit(state, { ...state.doc, backgroundColor: color }, 'background')),

      setDocumentName: name =>
        set(state => commit(state, { ...state.doc, name }, 'documentName')),

      adoptRecord: (templateId, name) =>
        set(state => ({
          doc: { ...state.doc, templateId, name: state.doc.name ?? name },
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
            ...restoreFocus(previous, state.selectedId, state.activePageIndex),
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
            ...restoreFocus(next, state.selectedId, state.activePageIndex),
          };
        }),
    }),
    {
      name: 'smart-label-document-store',
      // Selection, page and history are per-session; only the document is
      // restored, and it always reopens on its first page.
      partialize: state => ({ doc: state.doc }),
      merge: (persisted, current) => {
        const saved = persisted as { doc?: LabelDocument | FlatDocument } | undefined;
        const doc = saved?.doc;
        // Documents saved before multi-page have no `pages`, so accept either
        // shape here and upgrade — the alternative is throwing away whatever
        // the operator had open when they last closed the tab.
        const isUsable
          = doc
            && typeof doc.widthMm === 'number'
            && typeof doc.heightMm === 'number'
            && (Array.isArray((doc as FlatDocument).elements)
              || Array.isArray((doc as LabelDocument).pages));

        return {
          ...current,
          doc: isUsable ? toPagedDocument(doc) : current.doc,
        };
      },
    },
  ),
);

/**
 * Elements of the page on screen.
 *
 * Every editing surface reads through this rather than `doc`, so "the elements"
 * means the same thing in the canvas, the layer list and the format bar — and
 * adding a page cannot leave one of them drawing page one for ever.
 */
export function useActiveElements(): readonly DocElement[] {
  return useDocumentStore(state => pageAt(state.doc, state.activePageIndex).elements);
}
