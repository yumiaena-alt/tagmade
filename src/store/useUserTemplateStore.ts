/**
 * Templates the operator saved themselves.
 *
 * A third store rather than part of `useDocumentStore`, for the same reason the
 * view store is separate: this is a library, not the thing being edited.
 * Deleting a saved template is not a change to the open document, so it has no
 * business in the undo history — and undoing a label edit must never resurrect
 * a template the operator deliberately threw away.
 *
 * They live in IndexedDB (see `idbStorage`), which is what makes "your work
 * saves itself" a promise this can keep — the ceiling below is the app's own,
 * to stop one runaway document eating the disk, not the browser's.
 */
import type { FlatDocument, LabelDocument } from '@/utils/documentModel';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toPagedDocument } from '@/utils/documentModel';
import { idbStorage } from './idbStorage';

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
 * Not a storage limit any more — IndexedDB would take far more — but a limit on
 * how much of somebody's disk a label editor may quietly claim. An image
 * element carries its file inline as a data URL, so this is roughly twenty
 * logo-bearing labels rather than the two the old 2MB pot held.
 *
 * Exported so a test can build a document that overruns it without hard-coding
 * the number in two places.
 */
export const MAX_TOTAL_BYTES = 20_000_000;

export type SaveFailure = 'empty_name' | 'too_large';

type SaveResult
  = | { readonly ok: true; readonly id: string }
    | { readonly ok: false; readonly reason: SaveFailure };

type UserTemplateStore = {
  readonly templates: readonly UserTemplate[];
  /**
   * False until storage has been read.
   *
   * IndexedDB answers asynchronously, so for the first moments of a visit this
   * store honestly does not know what is saved. Anything that would act on an
   * empty list — telling the operator they have nothing, or recording the open
   * document as a new entry because the one it belongs to has not arrived
   * yet — has to wait for this. The second of those forked a duplicate on
   * every reload when it did not.
   */
  readonly isReady: boolean;
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
      isReady: false,
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
      storage: createJSONStorage(() => idbStorage),
      // Runs after hydration, including when it failed — an unreadable store
      // still has to let the app start rather than wait for ever.
      onRehydrateStorage: () => () => {
        useUserTemplateStore.setState({ isReady: true });
      },
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
