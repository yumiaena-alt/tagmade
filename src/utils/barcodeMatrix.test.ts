import { describe, expect, it } from 'vitest';
import { code128Symbol, isValidCode128 } from './barcodeMatrix';

describe('barcodeMatrix', () => {
  describe('isValidCode128', () => {
    it('accepts printable ASCII', () => {
      expect(isValidCode128('BVRI-2026-TS-S')).toBe(true);
      expect(isValidCode128('abc 123 !@#')).toBe(true);
    });

    it('rejects Hangul, which Code 128 cannot encode', () => {
      expect(isValidCode128('한글SKU')).toBe(false);
    });

    it('rejects empty input', () => {
      expect(isValidCode128('')).toBe(false);
    });
  });

  describe('code128Symbol', () => {
    it('encodes a SKU into bar runs', () => {
      const symbol = code128Symbol('BVRI-0001');

      expect(symbol).not.toBeNull();
      expect(symbol!.units).toBeGreaterThan(0);
      expect(symbol!.bars.length).toBeGreaterThan(0);
    });

    it('starts with a bar, as every Code 128 symbol must', () => {
      const symbol = code128Symbol('BVRI-0001')!;

      expect(symbol.bars[0]!.x).toBe(0);
    });

    it('keeps every bar inside the symbol width', () => {
      const symbol = code128Symbol('BVRI-2026-TS-S')!;

      symbol.bars.forEach((bar) => {
        expect(bar.width).toBeGreaterThan(0);
        expect(bar.x + bar.width).toBeLessThanOrEqual(symbol.units);
      });
    });

    it('produces non-overlapping runs in ascending order', () => {
      const symbol = code128Symbol('BVRI-2026-TS-S')!;

      symbol.bars.slice(1).forEach((bar, index) => {
        const previous = symbol.bars[index]!;

        // A gap must separate runs, otherwise they would have been merged.
        expect(bar.x).toBeGreaterThan(previous.x + previous.width);
      });
    });

    it('grows the symbol for longer values', () => {
      const short = code128Symbol('A')!;
      const long = code128Symbol('AAAAAAAAAAAAAAAAAAAA')!;

      expect(long.units).toBeGreaterThan(short.units);
    });

    it('is deterministic for the same value', () => {
      expect(code128Symbol('BVRI-0001')).toEqual(code128Symbol('BVRI-0001'));
    });

    it('produces different symbols for different values', () => {
      expect(code128Symbol('BVRI-0001')).not.toEqual(code128Symbol('BVRI-0002'));
    });

    it('returns null for input Code 128 cannot encode', () => {
      expect(code128Symbol('한글')).toBeNull();
      expect(code128Symbol('')).toBeNull();
      expect(code128Symbol('   ')).toBeNull();
    });

    it('does not emit a full-width bar, which would black out the symbol', () => {
      const symbol = code128Symbol('BVRI-2026-TS-S')!;

      symbol.bars.forEach((bar) => {
        expect(bar.width).toBeLessThan(symbol.units * 0.5);
      });
    });
  });
});
