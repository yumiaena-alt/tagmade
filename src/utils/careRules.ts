/**
 * FR-02: Care symbol rule engine (KS K 0021).
 *
 * Maps a standardized fabric composition onto the five statutory care symbol
 * categories. Sensitive fibers are checked top-down so that a small amount of a
 * delicate fiber (1% wool) still governs the whole garment's care instructions.
 */
import type { FabricComposition, StandardFiber } from './fabricParser';

/** The five statutory symbol slots every label must show, in print order. */
export const CARE_SYMBOL_CATEGORIES = [
  'wash',
  'bleach',
  'dry',
  'iron',
  'dryClean',
] as const;

type CareSymbolCategory = typeof CARE_SYMBOL_CATEGORIES[number];

/** Priority tiers, highest precedence first. */
const CARE_TIERS = ['animal', 'regenerated', 'synthetic', 'basic'] as const;

export type CareTier = typeof CARE_TIERS[number];

type CareSymbol = {
  readonly category: CareSymbolCategory;
  /** Stable identifier for the icon asset. */
  readonly code: string;
  /** Korean caption printed next to the icon. */
  readonly label: string;
};

export type CareGuide = {
  /** The tier that determined the symbol set. */
  readonly tier: CareTier;
  /** Human-readable explanation of why this tier was applied. */
  readonly reason: string;
  /** Exactly one symbol per category in `CARE_SYMBOL_CATEGORIES`. */
  readonly symbols: readonly CareSymbol[];
  /** Care cautions, including any contributed by lower matching tiers. */
  readonly warnings: readonly string[];
};

/** Tiers that are triggered by specific fibers. `basic` is the fallback. */
type SensitiveTier = Exclude<CareTier, 'basic'>;

const TIER_FIBERS: Record<SensitiveTier, readonly StandardFiber[]> = {
  animal: ['울', '실크', '캐시미어', '앙고라', '알파카', '모헤어'],
  regenerated: ['레이온', '린넨', '리오셀', '모달', '큐프라', '헴프'],
  synthetic: [
    '폴리우레탄',
    '나일론',
    '폴리에스터',
    '아크릴',
    '아세테이트',
    '폴리프로필렌',
  ],
};

/**
 * Minimum share that makes a fiber govern the care instructions.
 * Animal fibers use the statutory 1% trigger; other tiers apply at any share.
 */
const TIER_THRESHOLDS: Record<SensitiveTier, number> = {
  animal: 1,
  regenerated: 0,
  synthetic: 0,
};

const TIER_LABELS: Record<CareTier, string> = {
  animal: '동물성 섬유',
  regenerated: '재생·식물성 섬유',
  synthetic: '합성 섬유',
  basic: '기본 소재',
};

/** The care regime each tier imposes, used in the explanation sentence. */
const TIER_ACTIONS: Record<CareTier, string> = {
  animal: '드라이클리닝',
  regenerated: '손세탁·드라이클리닝',
  synthetic: '저온 세탁·다림질',
  basic: '일반 물세탁',
};

type TierRule = {
  readonly symbols: readonly CareSymbol[];
  readonly warnings: readonly string[];
};

/** Builds the five-symbol set for a tier, keeping print order stable. */
function symbolSet(
  entries: Record<CareSymbolCategory, Omit<CareSymbol, 'category'>>,
): readonly CareSymbol[] {
  return CARE_SYMBOL_CATEGORIES.map(category => ({
    category,
    ...entries[category],
  }));
}

const TIER_RULES: Record<CareTier, TierRule> = {
  animal: {
    symbols: symbolSet({
      wash: { code: 'WASH_DO_NOT', label: '물세탁 금지' },
      bleach: { code: 'BLEACH_DO_NOT', label: '표백 금지' },
      dry: { code: 'DRY_FLAT_SHADE', label: '그늘에 눕혀서 건조' },
      iron: { code: 'IRON_110_CLOTH', label: '110℃ 이하 · 덮천 사용' },
      dryClean: { code: 'DRYCLEAN_REQUIRED', label: '드라이클리닝 필수' },
    }),
    warnings: [
      '드라이클리닝 전문점에 의뢰하세요',
      '기계 건조(건조기) 금지',
      '비틀어 짜지 마세요',
    ],
  },
  regenerated: {
    symbols: symbolSet({
      wash: { code: 'WASH_HAND_30', label: '30℃ 손세탁' },
      bleach: { code: 'BLEACH_DO_NOT', label: '표백 금지' },
      dry: { code: 'DRY_LINE_SHADE', label: '그늘에 걸어서 건조' },
      iron: { code: 'IRON_150', label: '150℃ 이하' },
      dryClean: { code: 'DRYCLEAN_ANY', label: '드라이클리닝 가능' },
    }),
    warnings: [
      '손세탁 또는 드라이클리닝을 권장합니다',
      '물에 젖은 상태에서 강하게 문지르지 마세요',
      '기계 건조(건조기) 금지',
    ],
  },
  synthetic: {
    symbols: symbolSet({
      wash: { code: 'WASH_30_MILD', label: '30℃ 약한 물세탁' },
      bleach: { code: 'BLEACH_NON_CHLORINE', label: '산소계 표백만 가능' },
      dry: { code: 'DRY_TUMBLE_LOW', label: '저온 기계 건조' },
      iron: { code: 'IRON_110_NO_STEAM', label: '110℃ 이하 · 스팀 금지' },
      dryClean: { code: 'DRYCLEAN_PETROLEUM', label: '석유계 드라이클리닝만' },
    }),
    warnings: [
      '저온에서 다림질하세요 (고온 시 열 변형)',
      '건조기 사용 시 수축·변형 주의',
    ],
  },
  basic: {
    symbols: symbolSet({
      wash: { code: 'WASH_40', label: '40℃ 물세탁' },
      bleach: { code: 'BLEACH_ANY', label: '표백 가능' },
      dry: { code: 'DRY_LINE', label: '걸어서 건조' },
      iron: { code: 'IRON_180', label: '180℃ 이하' },
      dryClean: { code: 'DRYCLEAN_ANY', label: '드라이클리닝 가능' },
    }),
    warnings: ['첫 세탁 시 단독 세탁을 권장합니다'],
  },
};

type TierMatch = {
  readonly tier: SensitiveTier;
  readonly fibers: readonly string[];
};

/** Fibers of `tier` present in `composition` at or above the tier threshold. */
function matchedFibers(
  composition: FabricComposition,
  tier: SensitiveTier,
): readonly string[] {
  const threshold = TIER_THRESHOLDS[tier];

  return TIER_FIBERS[tier].filter((fiber) => {
    const percent = composition[fiber] ?? 0;

    return percent > 0 && percent >= threshold;
  });
}

/** Every triggered tier, ordered by precedence. */
function detectTiers(composition: FabricComposition): readonly TierMatch[] {
  return CARE_TIERS.filter((tier): tier is SensitiveTier => tier !== 'basic')
    .map(tier => ({ tier, fibers: matchedFibers(composition, tier) }))
    .filter(match => match.fibers.length > 0);
}

function describeFibers(
  composition: FabricComposition,
  fibers: readonly string[],
): string {
  return fibers.map(fiber => `${fiber} ${composition[fiber]}%`).join(', ');
}

function buildReason(
  composition: FabricComposition,
  match: TierMatch | undefined,
): string {
  if (!match) {
    const fibers = Object.keys(composition);

    return fibers.length > 0
      ? `${describeFibers(composition, fibers)} — 일반 물세탁 기준 적용`
      : '혼용률 정보 없음 — 기본 물세탁 기준 적용';
  }

  const detail = describeFibers(composition, match.fibers);

  return `${TIER_LABELS[match.tier]} 포함 (${detail}) — ${TIER_ACTIONS[match.tier]} 기준 적용`;
}

/**
 * Derives the statutory care symbols and cautions for a fabric composition.
 *
 * The highest matching tier determines the five symbols. Lower tiers that also
 * match still contribute their cautions, so a wool/spandex blend keeps both the
 * dry-clean requirement and the low-temperature ironing warning.
 *
 * @param composition Standardized composition from {@link parseFabricComposition}.
 * @returns The symbol set, applied tier, reason, and deduplicated cautions.
 */
export function buildCareGuide(composition: FabricComposition): CareGuide {
  const matches = detectTiers(composition);
  const primary = matches[0];
  const tier: CareTier = primary?.tier ?? 'basic';

  const secondaryWarnings = matches
    .slice(1)
    .flatMap(match => TIER_RULES[match.tier].warnings);

  return {
    tier,
    reason: buildReason(composition, primary),
    symbols: TIER_RULES[tier].symbols,
    warnings: [
      ...new Set([...TIER_RULES[tier].warnings, ...secondaryWarnings]),
    ],
  };
}
