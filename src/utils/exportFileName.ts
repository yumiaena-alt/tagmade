/**
 * Names for the files the studio hands to the browser.
 *
 * Shared by the PNG and PDF buttons, which had each grown the same private
 * helper. Page numbering is decided here rather than left to chance: a document
 * whose second page arrives as `tag(1).png` because the browser deduplicated a
 * repeated name is a support question waiting to happen.
 */

/** What a filesystem will take: word characters, dots and dashes. */
function safe(name: string): string {
  return name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
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
