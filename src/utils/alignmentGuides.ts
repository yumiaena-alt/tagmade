/**
 * Alignment snapping for a dragged element.
 *
 * Pure geometry in millimetres, deliberately separate from the canvas: the
 * canvas knows about pointers and Konva nodes, this knows about boxes. Keeping
 * it here is what makes the behaviour testable without mounting a stage.
 *
 * Box sizes come from `elementSize`, the same function the renderers and
 * `clampElement` use — a barcode is taller than its bars and a care-symbol
 * block is five glyphs wide, and measuring that again here is how the guides
 * would end up pointing at the wrong edge.
 */
import type { DocElement, LabelDocument } from './documentModel';
import { elementSize } from './documentModel';

/**
 * How close, in **screen pixels**, an edge has to be before it snaps.
 *
 * Pixels rather than millimetres because this is a pointing tolerance, not a
 * property of the artwork: a fixed 0.5mm would be an immovable magnet at 800%
 * zoom and unreachable at 20%. The canvas divides by its current scale.
 */
export const SNAP_TOLERANCE_PX = 6;

type GuideOrientation = 'vertical' | 'horizontal';

/** A line the drag lined up with, for drawing feedback while it is held. */
export type AlignmentGuide = {
  readonly orientation: GuideOrientation;
  /** Millimetres: x for a vertical guide, y for a horizontal one. */
  readonly at: number;
};

export type SnapResult = {
  readonly position: { x: number; y: number };
  /** Empty when nothing was close enough. */
  readonly guides: readonly AlignmentGuide[];
};

export type Snap = {
  /** Added to the position to land on the target. */
  readonly shift: number;
  /** Where the guide line goes. */
  readonly at: number;
};

/**
 * Distance below which two candidates count as equally good.
 *
 * A nanometre — far under anything the artwork can express, so this can only
 * ever mask floating-point noise, never a real difference. Without it, edges
 * that are mathematically the same distance away are ordered by their rounding
 * error: `|35 - 35.3|` computes fractionally smaller than `|30 - 30.3|`, and
 * the guide would jump between an element's edge and its centre line mid-drag
 * while the snapped position stayed put.
 */
const TIE_EPSILON = 1e-9;

/**
 * The closest target within tolerance, or null.
 *
 * Ties go to the earliest candidate. Edges are offered leading-first and
 * neighbours before the page, so aligning to something visible beats centring
 * on the page, and an edge beats a centre line — which is what the operator
 * sees themselves doing.
 */
function bestSnap(
  edges: readonly number[],
  targets: readonly number[],
  tolerance: number,
): Snap | null {
  let best: Snap | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const edge of edges) {
    for (const target of targets) {
      const distance = Math.abs(target - edge);

      if (distance <= tolerance && distance < bestDistance - TIE_EPSILON) {
        bestDistance = distance;
        best = { shift: target - edge, at: target };
      }
    }
  }

  return best;
}

/** Leading edge, centre and trailing edge — the three lines a box aligns by. */
function edgesOf(start: number, length: number): readonly number[] {
  return [start, start + length / 2, start + length];
}

/** Every line on the page worth aligning to, split by axis. */
export type AlignmentTargets = {
  readonly x: readonly number[];
  readonly y: readonly number[];
};

/**
 * The lines a gesture can land on: the three of every other element, plus the
 * page's edges and centre.
 *
 * Shared by moving and resizing so the two agree about what counts as aligned —
 * an element that snapped while being dragged has to snap to the same line when
 * its edge is pulled to it, or the guides would contradict each other.
 *
 * @param others Everything except the element being changed. Leaving it in
 * makes every gesture snap to where it already is.
 */
export function alignmentTargets(
  others: readonly DocElement[],
  page: Pick<LabelDocument, 'widthMm' | 'heightMm'>,
): AlignmentTargets {
  const x: number[] = [];
  const y: number[] = [];

  for (const other of others) {
    const size = elementSize(other);

    x.push(...edgesOf(other.x, size.width));
    y.push(...edgesOf(other.y, size.height));
  }

  x.push(0, page.widthMm / 2, page.widthMm);
  y.push(0, page.heightMm / 2, page.heightMm);

  return { x, y };
}

/**
 * Pulls a single edge onto whatever it is nearly lined up with.
 *
 * A resize moves one edge and leaves the opposite one where it is, so unlike a
 * drag there is no box to shift — only the held edge is a candidate, and the
 * caller turns the returned shift into a new width or height.
 *
 * @param tolerance In millimetres, derived from `SNAP_TOLERANCE_PX` and scale.
 */
export function snapEdge(
  edge: number,
  targets: readonly number[],
  tolerance: number,
): Snap | null {
  return bestSnap([edge], targets, tolerance);
}

/**
 * Pulls a dragged position onto whatever it is nearly lined up with.
 *
 * Targets are the three lines of every other element on the page plus the
 * page's own edges and centre. Each axis is decided on its own, so an element
 * can snap horizontally to a neighbour while staying free vertically.
 *
 * @param others Elements to align against. The dragged element must not be in
 * here, or every position snaps to where it already is.
 * @param tolerance In millimetres. Derive it from `SNAP_TOLERANCE_PX` and the
 * canvas scale rather than hardcoding a distance.
 */
export function snapPosition(
  moving: DocElement,
  others: readonly DocElement[],
  page: Pick<LabelDocument, 'widthMm' | 'heightMm'>,
  position: { x: number; y: number },
  tolerance: number,
): SnapResult {
  const { width, height } = elementSize(moving);
  const targets = alignmentTargets(others, page);

  const x = bestSnap(edgesOf(position.x, width), targets.x, tolerance);
  const y = bestSnap(edgesOf(position.y, height), targets.y, tolerance);

  const guides: AlignmentGuide[] = [];

  if (x) {
    guides.push({ orientation: 'vertical', at: x.at });
  }

  if (y) {
    guides.push({ orientation: 'horizontal', at: y.at });
  }

  return {
    position: {
      x: position.x + (x?.shift ?? 0),
      y: position.y + (y?.shift ?? 0),
    },
    guides,
  };
}
