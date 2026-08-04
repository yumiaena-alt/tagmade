import { describe, expect, it } from 'vitest';
import { qrMatrix, qrRects } from './qrMatrix';

describe('qrMatrix', () => {
  describe('qrMatrix', () => {
    it('encodes a URL into a square module grid', () => {
      const matrix = qrMatrix('https://bvri.example/ts-s');

      expect(matrix).not.toBeNull();
      expect(matrix!.size).toBeGreaterThanOrEqual(21);
      expect(matrix!.modules).toHaveLength(matrix!.size * matrix!.size);
    });

    it('produces the finder pattern in the top-left corner', () => {
      const matrix = qrMatrix('BVRI')!;
      const at = (row: number, col: number) => matrix.modules[row * matrix.size + col];

      // The 7x7 finder is a dark ring with a dark 3x3 core and a light gap.
      expect(at(0, 0)).toBe(true);
      expect(at(0, 6)).toBe(true);
      expect(at(6, 0)).toBe(true);
      expect(at(1, 1)).toBe(false);
      expect(at(3, 3)).toBe(true);
    });

    it('grows the grid for longer payloads', () => {
      const short = qrMatrix('A')!;
      const long = qrMatrix('A'.repeat(300))!;

      expect(long.size).toBeGreaterThan(short.size);
    });

    it('is deterministic for the same payload', () => {
      expect(qrMatrix('BVRI-2026')).toEqual(qrMatrix('BVRI-2026'));
    });

    it('returns null for blank input rather than throwing', () => {
      expect(qrMatrix('')).toBeNull();
      expect(qrMatrix('   ')).toBeNull();
    });

    it('returns null when the payload cannot be encoded', () => {
      // Far beyond the capacity of the largest version.
      expect(qrMatrix('x'.repeat(10000))).toBeNull();
    });
  });

  describe('qrRects', () => {
    it('collapses a row of dark modules into one run', () => {
      const matrix = { size: 3, modules: [true, true, true, false, false, false, false, false, false] };

      expect(qrRects(matrix)).toEqual([{ x: 0, y: 0, width: 3 }]);
    });

    it('splits a row at every light module', () => {
      const matrix = { size: 5, modules: [
        true,
        false,
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
      ] };

      expect(qrRects(matrix)).toEqual([
        { x: 0, y: 0, width: 1 },
        { x: 2, y: 0, width: 2 },
      ]);
    });

    it('closes a run that reaches the right edge', () => {
      const matrix = { size: 2, modules: [false, true, false, false] };

      expect(qrRects(matrix)).toEqual([{ x: 1, y: 0, width: 1 }]);
    });

    it('returns nothing for an all-light grid', () => {
      expect(qrRects({ size: 2, modules: [false, false, false, false] })).toEqual([]);
    });

    it('covers exactly the dark modules of a real code', () => {
      const matrix = qrMatrix('https://bvri.example')!;
      const darkModules = matrix.modules.filter(Boolean).length;
      const covered = qrRects(matrix).reduce((sum, rect) => sum + rect.width, 0);

      expect(covered).toBe(darkModules);
    });

    it('uses far fewer rectangles than modules', () => {
      const matrix = qrMatrix('https://bvri.example/ts-s')!;

      expect(qrRects(matrix).length).toBeLessThan(matrix.modules.length / 3);
    });
  });
});
