import { describe, expect, it } from 'vitest';
import { buildCareGuide, CARE_SYMBOL_CATEGORIES } from './careRules';
import { parseFabricComposition } from './fabricParser';

describe('careRules', () => {
  describe('symbol set shape', () => {
    it('always emits exactly one symbol per care category', () => {
      const guide = buildCareGuide({ 면: 100 });

      expect(guide.symbols).toHaveLength(CARE_SYMBOL_CATEGORIES.length);
      expect(guide.symbols.map(symbol => symbol.category)).toEqual([
        ...CARE_SYMBOL_CATEGORIES,
      ]);
    });

    it('gives every symbol a stable icon code and a Korean label', () => {
      const guide = buildCareGuide({ 울: 100 });

      guide.symbols.forEach((symbol) => {
        expect(symbol.code).toMatch(/^[A-Z][A-Z0-9_]*$/);
        expect(symbol.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('tier 1 - animal fibers', () => {
    it('requires dry cleaning when wool reaches the 1% threshold', () => {
      const guide = buildCareGuide({ 면: 99, 울: 1 });

      expect(guide.tier).toBe('animal');
      expect(symbolCode(guide, 'dryClean')).toBe('DRYCLEAN_REQUIRED');
    });

    it('forbids machine drying for animal fibers', () => {
      const guide = buildCareGuide({ 캐시미어: 100 });

      expect(guide.tier).toBe('animal');
      expect(symbolCode(guide, 'dry')).toBe('DRY_FLAT_SHADE');
      expect(guide.warnings).toContain('기계 건조(건조기) 금지');
    });

    it('treats silk as an animal fiber', () => {
      expect(buildCareGuide({ 실크: 100 }).tier).toBe('animal');
    });

    it('does not trigger the animal tier below the 1% threshold', () => {
      const guide = buildCareGuide({ 면: 99.5, 울: 0.5 });

      expect(guide.tier).toBe('basic');
    });
  });

  describe('tier 2 - regenerated and plant fibers', () => {
    it('recommends hand washing for rayon', () => {
      const guide = buildCareGuide({ 레이온: 100 });

      expect(guide.tier).toBe('regenerated');
      expect(symbolCode(guide, 'wash')).toBe('WASH_HAND_30');
      expect(symbolCode(guide, 'dryClean')).toBe('DRYCLEAN_ANY');
    });

    it('treats linen as a regenerated-tier fiber', () => {
      expect(buildCareGuide({ 린넨: 100 }).tier).toBe('regenerated');
    });

    it('yields to the animal tier when both are present', () => {
      expect(buildCareGuide({ 울: 50, 레이온: 50 }).tier).toBe('animal');
    });
  });

  describe('tier 3 - synthetic fibers', () => {
    it('requires low-temperature ironing for spandex blends', () => {
      const guide = buildCareGuide({ 면: 95, 폴리우레탄: 5 });

      expect(guide.tier).toBe('synthetic');
      expect(symbolCode(guide, 'iron')).toBe('IRON_110_NO_STEAM');
    });

    it('warns about tumble drying for nylon', () => {
      const guide = buildCareGuide({ 나일론: 100 });

      expect(guide.tier).toBe('synthetic');
      expect(guide.warnings).toContain('건조기 사용 시 수축·변형 주의');
    });

    it('treats polyester as a synthetic fiber', () => {
      expect(buildCareGuide({ 면: 80, 폴리에스터: 20 }).tier).toBe('synthetic');
    });

    it('yields to the regenerated tier when both are present', () => {
      expect(buildCareGuide({ 레이온: 95, 폴리우레탄: 5 }).tier).toBe('regenerated');
    });
  });

  describe('tier 4 - cotton baseline', () => {
    it('allows a normal 40C machine wash for pure cotton', () => {
      const guide = buildCareGuide({ 면: 100 });

      expect(guide.tier).toBe('basic');
      expect(symbolCode(guide, 'wash')).toBe('WASH_40');
    });

    it('falls back to the baseline for an unknown fiber', () => {
      expect(buildCareGuide({ 신소재: 100 }).tier).toBe('basic');
    });

    it('falls back to the baseline for an empty composition', () => {
      const guide = buildCareGuide({});

      expect(guide.tier).toBe('basic');
      expect(guide.symbols).toHaveLength(CARE_SYMBOL_CATEGORIES.length);
    });
  });

  describe('warnings', () => {
    it('keeps lower-tier warnings when a higher tier governs the symbols', () => {
      const guide = buildCareGuide({ 울: 60, 폴리우레탄: 5 });

      expect(guide.tier).toBe('animal');
      expect(guide.warnings).toContain('기계 건조(건조기) 금지');
      expect(guide.warnings).toContain('건조기 사용 시 수축·변형 주의');
    });

    it('does not repeat a warning shared by two matching tiers', () => {
      const guide = buildCareGuide({ 울: 50, 레이온: 30, 폴리우레탄: 20 });
      const unique = new Set(guide.warnings);

      expect(unique.size).toBe(guide.warnings.length);
    });

    it('names the fibers that triggered the applied tier', () => {
      const guide = buildCareGuide({ 면: 40, 울: 60 });

      expect(guide.reason).toContain('울 60%');
    });
  });
});

describe('parser to rule engine pipeline', () => {
  it('routes raw seller input through to the matching tier', () => {
    const cases = [
      { input: '면 100%', tier: 'basic' },
      { input: '코튼80 스판5 나일론15', tier: 'synthetic' },
      { input: '면 80% 폴리 20%', tier: 'synthetic' },
      { input: '레이온 95% 스판 5%', tier: 'regenerated' },
      { input: '울 99% 스판 1%', tier: 'animal' },
      { input: 'Cashmere 5%, Wool 95%', tier: 'animal' },
      // A compound wool spelling must not fall through to the 40C cotton baseline.
      { input: '메리노울 100%', tier: 'animal' },
    ] as const;

    cases.forEach(({ input, tier }) => {
      const guide = buildCareGuide(parseFabricComposition(input));

      expect(guide.tier, `input: ${input}`).toBe(tier);
    });
  });

  it('never leaves a parsed composition without the full symbol set', () => {
    const guide = buildCareGuide(parseFabricComposition('알 수 없는 소재 표기'));

    expect(guide.symbols).toHaveLength(CARE_SYMBOL_CATEGORIES.length);
  });
});

function symbolCode(
  guide: ReturnType<typeof buildCareGuide>,
  category: (typeof CARE_SYMBOL_CATEGORIES)[number],
): string | undefined {
  return guide.symbols.find(symbol => symbol.category === category)?.code;
}
