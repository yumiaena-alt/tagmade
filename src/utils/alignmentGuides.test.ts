import type { DocElement } from './documentModel';
import { describe, expect, it } from 'vitest';
import { snapPosition } from './alignmentGuides';

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
