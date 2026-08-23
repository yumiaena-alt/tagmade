/**
 * Hands a generated file to the browser.
 *
 * The same six lines had been copied into every export path, and the object URL
 * is the part that is easy to get wrong: forget to revoke it and the blob stays
 * in memory for the life of the tab, which for a label carrying a few inlined
 * images is megabytes per download.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
