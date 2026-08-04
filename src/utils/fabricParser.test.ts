import { describe, expect, it } from 'vitest';
import { parseFabricComposition, standardizeFiberName } from './fabricParser';

describe('fabricParser', () => {
  describe('standardizeFiberName', () => {
    it('maps a colloquial Korean alias to its legal standard name', () => {
      expect(standardizeFiberName('코튼')).toBe('면');
    });

    it('maps 스판 to 폴리우레탄 as required by the labelling standard', () => {
      expect(standardizeFiberName('스판')).toBe('폴리우레탄');
    });

    it('is case insensitive for English aliases', () => {
      expect(standardizeFiberName('COTTON')).toBe('면');
      expect(standardizeFiberName('Elastane')).toBe('폴리우레탄');
    });

    it('resolves a compound name by its embedded alias', () => {
      expect(standardizeFiberName('오가닉코튼')).toBe('면');
    });

    it('resolves a compound wool name by its trailing head noun', () => {
      expect(standardizeFiberName('메리노울')).toBe('울');
      expect(standardizeFiberName('램스울')).toBe('울');
    });

    it('maps the alternate polyamide spelling to 나일론', () => {
      expect(standardizeFiberName('폴리아마이드')).toBe('나일론');
    });

    it('keeps an unknown fiber name so it is never silently dropped', () => {
      expect(standardizeFiberName('신소재')).toBe('신소재');
    });

    it('returns an empty string for blank input', () => {
      expect(standardizeFiberName('   ')).toBe('');
    });
  });

  describe('parseFabricComposition', () => {
    it('parses the reference input with percent signs', () => {
      expect(parseFabricComposition('면 80% 폴리 20%')).toEqual({
        면: 80,
        폴리에스터: 20,
      });
    });

    it('parses compact input with no percent signs or separators', () => {
      expect(parseFabricComposition('코튼80 스판5 나일론15')).toEqual({
        면: 80,
        폴리우레탄: 5,
        나일론: 15,
      });
    });

    it('parses decimal ratios', () => {
      expect(parseFabricComposition('면 97.5% 스판 2.5%')).toEqual({
        면: 97.5,
        폴리우레탄: 2.5,
      });
    });

    it('parses an English composition string', () => {
      expect(parseFabricComposition('Cotton 95%, Elastane 5%')).toEqual({
        면: 95,
        폴리우레탄: 5,
      });
    });

    it('parses ratios written before the fiber name', () => {
      expect(parseFabricComposition('80% 면 20% 폴리')).toEqual({
        면: 80,
        폴리에스터: 20,
      });
    });

    it('ignores section headers and keeps the adjacent fiber name', () => {
      expect(parseFabricComposition('겉감: 면 100%')).toEqual({ 면: 100 });
    });

    it('sums duplicate fibers that normalize to the same standard name', () => {
      expect(parseFabricComposition('면 50% 코튼 30% 폴리 20%')).toEqual({
        면: 80,
        폴리에스터: 20,
      });
    });

    it('preserves an unknown fiber under its original name', () => {
      expect(parseFabricComposition('면 90% 신소재 10%')).toEqual({
        면: 90,
        신소재: 10,
      });
    });

    it('discards ratios outside the valid 0-100 range', () => {
      expect(parseFabricComposition('면 0% 폴리 150% 나일론 10%')).toEqual({
        나일론: 10,
      });
    });

    it('returns an empty object when no ratio can be extracted', () => {
      expect(parseFabricComposition('소재 미정')).toEqual({});
    });

    it('ignores a ratio that has no fiber name next to it', () => {
      expect(parseFabricComposition('100%')).toEqual({});
    });

    it('ignores a trailing ratio once the neighbouring name is taken', () => {
      expect(parseFabricComposition('면 80 90')).toEqual({ 면: 80 });
    });

    it('returns an empty object for blank input', () => {
      expect(parseFabricComposition('   ')).toEqual({});
    });

    it('does not mutate or reuse state across calls', () => {
      const first = parseFabricComposition('면 100%');
      const second = parseFabricComposition('울 100%');

      expect(first).toEqual({ 면: 100 });
      expect(second).toEqual({ 울: 100 });
    });
  });
});
