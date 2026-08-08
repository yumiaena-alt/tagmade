/**
 * Templates the operator saved themselves.
 *
 * A third store rather than part of `useDocumentStore`, for the same reason the
 * view store is separate: this is a library, not the thing being edited.
 * Deleting a saved template is not a change to the open document, so it has no
 * business in the undo history — and undoing a label edit must never resurrect
 * a template the operator deliberately threw away.
 *
 * Like the open document, they live in `localStorage`. That store is small and
 * shared, so a save that would not fit is refused with a reason rather than
 * silently dropped by the browser.
 */
import type { FlatDocument, LabelDocument } from '@/utils/documentModel';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toPagedDocument } from '@/utils/documentModel';

export type UserTemplate = {
  readonly id: string;
  readonly name: string;
  /** ISO timestamp, so the list can show newest first. */
  readonly savedAt: string;
  readonly document: LabelDocument;
};

/**
 * Ceiling for everything saved here.
 *
 * `localStorage` gives a page around 5MB in total, and the open document needs
 * its share of that. An image element carries its file inline as a data URL, so
 * a handful of logo-bearing labels can reach this on their own.
 */
const MAX_TOTAL_BYTES = 2_000_000;

export type SaveFailure = 'empty_name' | 'too_large';

type SaveResult
  = | { readonly ok: true; readonly id: string }
    | { readonly ok: false; readonly reason: SaveFailure };

type UserTemplateStore = {
  readonly templates: readonly UserTemplate[];
  /**
   * Why the last record was refused, or null.
   *
   * Recording happens by itself, so a refusal has to be visible somewhere or
   * the operator would believe work was being kept when it was not.
   */
  readonly lastFailure: SaveFailure | null;
  /**
   * Records the open document.
   *
   * The first call for a document creates an entry under `fallbackName` and
   * returns its id, which the caller stamps onto the document; every call after
   * that recognises the id and updates that entry in place. So an edit is the
   * only thing an operator has to do to keep their work — there is no save
   * button to forget.
   */
  readonly recordWorking: (
    doc: LabelDocument,
    fallbackName: string,
  ) => SaveResult;
  readonly removeTemplate: (id: string) => void;
};

/** True for an id this store minted, as opposed to a built-in template's. */
export function isUserTemplateId(id: string): boolean {
  return id.startsWith('user-');
}

function byteLength(templates: readonly UserTemplate[]): number {
  return new Blob([JSON.stringify(templates)]).size;
}

let counter = 0;

function nextId(): string {
  counter += 1;

  return `user-${Date.now().toString(36)}-${counter}`;
}

export const useUserTemplateStore = create<UserTemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],
      lastFailure: null,

      recordWorking: (doc, fallbackName) => {
        const { templates } = get();
        const existing = templates.find(item => item.id === doc.templateId);
        const id = existing?.id ?? nextId();
        const name = (doc.name ?? existing?.name ?? fallbackName).trim();

        if (!name) {
          set({ lastFailure: 'empty_name' });

          return { ok: false, reason: 'empty_name' };
        }

        const entry: UserTemplate = {
          id,
          name,
          savedAt: new Date().toISOString(),
          document: { ...doc, templateId: id, name },
        };

        // The one being worked on goes to the front, so the list reads
        // newest-touched first.
        const rest = templates.filter(item => item.id !== id);
        const next = [entry, ...rest];

        if (byteLength(next) > MAX_TOTAL_BYTES) {
          set({ lastFailure: 'too_large' });

          return { ok: false, reason: 'too_large' };
        }

        set({ templates: next, lastFailure: null });

        return { ok: true, id };
      },

      removeTemplate: id =>
        set(state => ({
          templates: state.templates.filter(item => item.id !== id),
          // Freeing space is the fix for a full store, so stop warning.
          lastFailure: null,
        })),
    }),
    {
      name: 'smart-label-user-templates',
      // A refusal belongs to the session that hit it, not to storage.
      partialize: state => ({ templates: state.templates }),
      merge: (persisted, current) => {
        const saved = persisted as { templates?: unknown } | undefined;
        const list = saved?.templates;

        if (!Array.isArray(list)) {
          return current;
        }

        // Anything malformed is dropped rather than handed to a renderer.
        // Entries saved before multi-page hold a flat document, so both shapes
        // are accepted here and paged on the way through.
        const usable = list
          .filter((item): item is UserTemplate => {
            const record = item as Partial<UserTemplate> | null;
            const doc = record?.document as
              | Partial<LabelDocument & FlatDocument>
              | undefined;

            return Boolean(
              record
              && typeof record.id === 'string'
              && typeof record.name === 'string'
              && doc
              && typeof doc.widthMm === 'number'
              && typeof doc.heightMm === 'number'
              && (Array.isArray(doc.elements) || Array.isArray(doc.pages)),
            );
          })
          .map(item => ({ ...item, document: toPagedDocument(item.document) }));

        return { ...current, templates: usable };
      },
    },
  ),
);
