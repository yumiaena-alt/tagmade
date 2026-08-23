/**
 * Names for the files the studio hands to the browser.
 *
 * Shared by the PNG and PDF buttons, which had each grown the same private
 * helper. Page numbering is decided here rather than left to chance: a document
 * whose second page arrives as `tag(1).png` because the browser deduplicated a
 * repeated name is a support question waiting to happen.
 */

/**
 * What a filesystem will take: letters, digits, dots and dashes.
 *
 * Letters means any script, not `\w`. `\w` is ASCII, so a label named
 * 행택 came out as `label.json` — every Korean document downloading under the
 * same anonymous name, which is the opposite of what a filename is for.
 */
function safe(name: string): string {
  return name.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '');
}

/**
 * What a document's files are called before the extension and page number.
 *
 * One rule in one place, because the three export paths had drifted: PNG used
 * the operator's name, PDF used the internal template id — so the file going to
 * a printer was called `user-mf3k2-1.pdf` — and JSON used the id as well. The
 * name is also the PDF's title metadata, so this returns it unsanitized and
 * leaves `exportFileName` to make it safe for a filesystem.
 */
export function documentBaseName(doc: {
  readonly name?: string;
  readonly templateId: string;
}): string {
  return doc.name?.trim() || doc.templateId;
}

export type ExportPage = {
  /** 1-based, because it ends up in a filename a person reads. */
  readonly number: number;
  /** The operator's own name for the page, when they gave it one. */
  readonly name?: string;
};

/**
 * `label.png`, or `label-2.png` / `label-2-back.png` for one page of many.
 *
 * @param page Omit for a single-page document — a lone `label-1.png` invites
 * the question of where the other pages went.
 */
export function exportFileName(
  base: string,
  extension: string,
  page?: ExportPage,
): string {
  const stem = safe(base) || 'label';

  if (!page) {
    return `${stem}.${extension}`;
  }

  const named = page.name ? safe(page.name) : '';

  return named
    ? `${stem}-${page.number}-${named}.${extension}`
    : `${stem}-${page.number}.${extension}`;
}
