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
import type { LabelDocument } from '@/utils/documentModel';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  /** Saves the document under `name`, replacing a template of the same name. */
  readonly saveTemplate: (name: string, doc: LabelDocument) => SaveResult;
  readonly removeTemplate: (id: string) => void;
};

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

      saveTemplate: (name, doc) => {
        const trimmed = name.trim();

        if (!trimmed) {
          return { ok: false, reason: 'empty_name' };
        }

        const id = nextId();
        const saved: UserTemplate = {
          id,
          name: trimmed,
          savedAt: new Date().toISOString(),
          // Stamped so the gallery can show which template the canvas came
          // from, and so re-saving under the same name overwrites cleanly.
          document: { ...doc, templateId: id },
        };

        // Same name means the operator is updating that template, not adding a
        // second one they would then have to tell apart.
        const rest = get().templates.filter(item => item.name !== trimmed);
        const next = [saved, ...rest];

        if (byteLength(next) > MAX_TOTAL_BYTES) {
          return { ok: false, reason: 'too_large' };
        }

        set({ templates: next });

        return { ok: true, id };
      },

      removeTemplate: id =>
        set(state => ({
          templates: state.templates.filter(item => item.id !== id),
        })),
    }),
    {
      name: 'smart-label-user-templates',
      merge: (persisted, current) => {
        const saved = persisted as { templates?: unknown } | undefined;
        const list = saved?.templates;

        if (!Array.isArray(list)) {
          return current;
        }

        // Anything malformed is dropped rather than handed to a renderer.
        const usable = list.filter((item): item is UserTemplate => {
          const record = item as Partial<UserTemplate> | null;

          return Boolean(
            record
            && typeof record.id === 'string'
            && typeof record.name === 'string'
            && record.document
            && typeof record.document.widthMm === 'number'
            && typeof record.document.heightMm === 'number'
            && Array.isArray(record.document.elements),
          );
        });

        return { ...current, templates: usable };
      },
    },
  ),
);
