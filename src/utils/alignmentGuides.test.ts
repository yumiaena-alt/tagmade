import type { DocElement } from './documentModel';
import { describe, expect, it } from 'vitest';
import { alignmentTargets, snapEdge, snapPosition, snapToGrid } from './alignmentGuides';

const PAGE = { widthMm: 100, heightMm: 100 };

function rect(id: string, x: number, y: number, width = 10, height = 10): DocElement {
  return { type: 'rect', id, labelKey: 'field_shape', x, y, width, height };
}

function text(id: string, x: number, y: number, fontSize: number): DocElement {
  return {
    type: 'text',
    id,
    labelKey: 'field_text',
    x,
    y,
    width: 20,
    fontSize,
    text: 'BVRI',
  };
}

describe('snapPosition', () => {
  it('lines a left edge up with a neighbour', () => {
    const result = snapPosition(
      rect('moving', 0, 0),
      [rect('other', 30, 70)],
      PAGE,
      { x: 30.3, y: 22 },
      1,
    );

    expect(result.position.x).toBeCloseTo(30);
    expect(result.position.y).toBeCloseTo(22);
    expect(result.guides).toEqual([{ orientation: 'vertical', at: 30 }]);
  });

  it('centres an element on the page', () => {
    const result = snapPosition(
      rect('moving', 0, 0),
      [],
      PAGE,
      { x: 44.6, y: 22 },
      1,
    );

    // The centre lands on 50, so the left edge sits half a width back.
    expect(result.position.x).toBeCloseTo(45);
    expect(result.guides).toEqual([{ orientation: 'vertical', at: 50 }]);
  });

  it('lines a trailing edge up with a neighbour', () => {
    const result = snapPosition(
      rect('moving', 0, 0),
      [rect('other', 39, 70, 2, 2)],
      PAGE,
      { x: 30.9, y: 22 },
      1,
    );

    expect(result.position.x).toBeCloseTo(31);
    expect(result.guides).toEqual([{ orientation: 'vertical', at: 41 }]);
  });

  it('leaves a position alone when nothing is close enough', () => {
    const result = snapPosition(
      rect('moving', 0, 0),
      [rect('other', 80, 80)],
      PAGE,
      { x: 44, y: 22 },
      0.2,
    );

    expect(result.position).toEqual({ x: 44, y: 22 });
    expect(result.guides).toEqual([]);
  });

  it('decides each axis on its own', () => {
    // Vertically 0.4 from the neighbour's top edge, horizontally nowhere near
    // anything: the y snaps and the x is left exactly where it was dropped.
    const result = snapPosition(
      rect('moving', 0, 0),
      [rect('other', 80, 30)],
      PAGE,
      { x: 44, y: 30.4 },
      0.5,
    );

    expect(result.position.x).toBe(44);
    expect(result.position.y).toBeCloseTo(30);
    expect(result.guides).toEqual([{ orientation: 'horizontal', at: 30 }]);
  });

  it('takes the nearer of two candidates', () => {
    const result = snapPosition(
      rect('moving', 0, 0),
      [rect('near', 30.2, 70), rect('far', 29, 70)],
      PAGE,
      { x: 30.4, y: 22 },
      2,
    );

    expect(result.position.x).toBeCloseTo(30.2);
  });

  it('prefers a neighbour to the page centre at equal distance', () => {
    // The left edge is 0.5 from the neighbour's; the centre is 0.5 from the
    // page's, so only the ordering rule decides this one.
    const result = snapPosition(
      rect('moving', 0, 0),
      [rect('other', 45, 70)],
      PAGE,
      { x: 45.5, y: 22 },
      1,
    );

    expect(result.position.x).toBeCloseTo(45);
    expect(result.guides).toEqual([{ orientation: 'vertical', at: 45 }]);
  });

  it('measures a text element by its rendered height, not its font size', () => {
    // fontSize 10 renders 13mm tall, so the centre is 6.5mm down, not 5mm.
    // Measuring it as 5mm would snap to 61 instead.
    const result = snapPosition(
      text('moving', 0, 0, 10),
      [rect('other', 80, 61, 2, 2)],
      PAGE,
      { x: 5, y: 55.7 },
      1,
    );

    expect(result.position.y).toBeCloseTo(55.5);
    expect(result.guides).toEqual([{ orientation: 'horizontal', at: 62 }]);
  });

  it('snaps to the page edges', () => {
    const result = snapPosition(
      rect('moving', 0, 0),
      [],
      PAGE,
      { x: 0.3, y: 89.8 },
      0.5,
    );

    expect(result.position.x).toBeCloseTo(0);
    expect(result.position.y).toBeCloseTo(90);
    expect(result.guides).toEqual([
      { orientation: 'vertical', at: 0 },
      { orientation: 'horizontal', at: 100 },
    ]);
  });
});

describe('alignmentTargets', () => {
  it('offers every edge, centre and page line', () => {
    const targets = alignmentTargets([rect('other', 30, 70, 10, 20)], PAGE);

    expect(targets.x).toEqual([30, 35, 40, 0, 50, 100]);
    expect(targets.y).toEqual([70, 80, 90, 0, 50, 100]);
  });

  it('offers only the page when nothing else is there', () => {
    const targets = alignmentTargets([], PAGE);

    expect(targets.x).toEqual([0, 50, 100]);
    expect(targets.y).toEqual([0, 50, 100]);
  });

  it('measures a neighbour the way the renderers do', () => {
    // A text box is as tall as one line, not as tall as its font size.
    const targets = alignmentTargets([text('other', 0, 10, 4)], PAGE);

    expect(targets.y).toEqual([10, 12.6, 15.2, 0, 50, 100]);
  });
});

describe('snapEdge', () => {
  const targets = [0, 30, 50, 100];

  it('pulls an edge onto the closest line within tolerance', () => {
    expect(snapEdge(30.3, targets, 1)).toEqual({
      shift: expect.closeTo(-0.3, 10),
      at: 30,
    });
  });

  it('reports the shift needed to grow onto a line', () => {
    expect(snapEdge(49.4, targets, 1)).toEqual({
      shift: expect.closeTo(0.6, 10),
      at: 50,
    });
  });

  it('leaves an edge alone when nothing is close', () => {
    expect(snapEdge(42, targets, 1)).toBeNull();
  });

  it('takes the nearer of two lines in range', () => {
    expect(snapEdge(29.6, [30, 29, 100], 1)).toEqual({
      shift: expect.closeTo(0.4, 10),
      at: 30,
    });
  });

  it('snaps exactly on a line to no movement at all', () => {
    expect(snapEdge(50, targets, 1)).toEqual({ shift: 0, at: 50 });
  });
});

describe('snapToGrid', () => {
  it('rounds to the nearest multiple', () => {
    expect(snapToGrid(12.4, 5)).toBe(10);
    expect(snapToGrid(12.6, 5)).toBe(15);
  });

  it('leaves a value already on the grid alone', () => {
    expect(snapToGrid(15, 5)).toBe(15);
  });

  it('rounds a negative value the same way', () => {
    expect(snapToGrid(-12.4, 5)).toBe(-10);
  });

  it('is no grid at all when the step is zero or less', () => {
    expect(snapToGrid(12.4, 0)).toBe(12.4);
    expect(snapToGrid(12.4, -5)).toBe(12.4);
  });
});

describe('snapPosition with a grid', () => {
  it('falls back to the grid when nothing lines up', () => {
    const result = snapPosition(
      rect('moving', 0, 0),
      [],
      PAGE,
      { x: 12.4, y: 17.7 },
      1,
      5,
    );

    expect(result.position).toEqual({ x: 10, y: 20 });
    expect(result.guides).toEqual([]);
  });

  it('lets an element win the axis it claimed', () => {
    const result = snapPosition(
      rect('moving', 0, 0),
      [rect('other', 32, 70)],
      PAGE,
      { x: 32.3, y: 17.7 },
      1,
      5,
    );

    // 32 is a neighbour's edge and not on the 5mm grid: the neighbour wins x,
    // and the grid still takes y, which nothing else claimed.
    expect(result.position.x).toBeCloseTo(32);
    expect(result.position.y).toBe(20);
    expect(result.guides).toEqual([{ orientation: 'vertical', at: 32 }]);
  });

  it('ignores the grid when no step is given', () => {
    const result = snapPosition(rect('moving', 0, 0), [], PAGE, { x: 12.4, y: 17.7 }, 1);

    expect(result.position).toEqual({ x: 12.4, y: 17.7 });
  });
});
