/** Longest thumbnail edge in pixels; the shorter edge follows the page ratio. */
const THUMB_MAX = 104;

/**
 * Fits a page of any proportion into the same thumbnail box.
 *
 * Shared by the built-in gallery and the operator's own templates so a 90×50
 * card and a 30×70 care label sit at the same scale in one list.
 */
export function thumbSize(
  widthMm: number,
  heightMm: number,
): { width: number; height: number } {
  const ratio = widthMm / heightMm;

  return ratio >= 1
    ? { width: THUMB_MAX, height: Math.round(THUMB_MAX / ratio) }
    : { width: Math.round(THUMB_MAX * ratio), height: THUMB_MAX };
}
