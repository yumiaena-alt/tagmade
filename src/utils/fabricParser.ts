/**
 * FR-01: Fabric composition extraction and standardization engine.
 *
 * Turns free-form seller input ("코튼80 스판5 나일론15") into a normalized
 * `{ 표준소재명: 비율 }` object that the care-symbol rule engine consumes.
 * Pure regex plus a lookup table, so it costs no AI tokens.
 */

/** Canonical fiber names used across the label pipeline. */
export type StandardFiber
  // 동물성
  = | '울'
    | '실크'
    | '캐시미어'
    | '앙고라'
    | '알파카'
    | '모헤어'
  // 재생 / 식물성
    | '레이온'
    | '린넨'
    | '리오셀'
    | '모달'
    | '큐프라'
    | '헴프'
  // 합성
    | '폴리에스터'
    | '폴리우레탄'
    | '나일론'
    | '아크릴'
    | '아세테이트'
    | '폴리프로필렌'
  // 기본
    | '면';

/**
 * Parsed composition keyed by standardized fiber name.
 * Unrecognized fibers keep their original spelling rather than being dropped,
 * so the operator can see and correct them.
 */
export type FabricComposition = Record<string, number>;

/**
 * Colloquial spelling -> legal standard name.
 * Keys must be lowercase; lookups are normalized before matching.
 */
const FIBER_ALIASES: Record<string, StandardFiber> = {
  // 면
  면: '면',
  코튼: '면',
  목화: '면',
  cotton: '면',
  // 폴리에스터
  폴리: '폴리에스터',
  폴리에스터: '폴리에스터',
  폴리에스테르: '폴리에스터',
  polyester: '폴리에스터',
  poly: '폴리에스터',
  // 폴리우레탄 (스판)
  스판: '폴리우레탄',
  스판덱스: '폴리우레탄',
  폴리우레탄: '폴리우레탄',
  라이크라: '폴리우레탄',
  spandex: '폴리우레탄',
  elastane: '폴리우레탄',
  lycra: '폴리우레탄',
  // 나일론
  나일론: '나일론',
  나이론: '나일론',
  폴리아미드: '나일론',
  폴리아마이드: '나일론',
  nylon: '나일론',
  polyamide: '나일론',
  // 레이온
  레이온: '레이온',
  비스코스: '레이온',
  인견: '레이온',
  rayon: '레이온',
  viscose: '레이온',
  // 린넨
  린넨: '린넨',
  리넨: '린넨',
  아마: '린넨',
  마: '린넨',
  linen: '린넨',
  // 리오셀 / 모달 / 큐프라
  리오셀: '리오셀',
  텐셀: '리오셀',
  lyocell: '리오셀',
  tencel: '리오셀',
  모달: '모달',
  modal: '모달',
  큐프라: '큐프라',
  큐프로: '큐프라',
  cupra: '큐프라',
  // 헴프
  헴프: '헴프',
  대마: '헴프',
  hemp: '헴프',
  // 울
  울: '울',
  모: '울',
  양모: '울',
  울모: '울',
  wool: '울',
  merino: '울',
  // 실크
  실크: '실크',
  견: '실크',
  명주: '실크',
  silk: '실크',
  // 그 외 동물성
  캐시미어: '캐시미어',
  캐시미어울: '캐시미어',
  cashmere: '캐시미어',
  앙고라: '앙고라',
  angora: '앙고라',
  알파카: '알파카',
  alpaca: '알파카',
  모헤어: '모헤어',
  mohair: '모헤어',
  // 그 외 합성
  아크릴: '아크릴',
  acrylic: '아크릴',
  아세테이트: '아세테이트',
  acetate: '아세테이트',
  폴리프로필렌: '폴리프로필렌',
  polypropylene: '폴리프로필렌',
};

const MAX_PERCENT = 100;

/**
 * Single-character aliases (`면`, `마`, `모`, `울`, `견`) would match far too
 * eagerly anywhere inside a word, so they are never matched as a substring.
 */
const SUBSTRING_ALIAS_MIN_LENGTH = 2;

const ALIAS_NAMES = Object.keys(FIBER_ALIASES);

/** Aliases eligible for substring matching, longest first so the most specific wins. */
const SUBSTRING_ALIASES = ALIAS_NAMES
  .filter(alias => alias.length >= SUBSTRING_ALIAS_MIN_LENGTH)
  .sort((a, b) => b.length - a.length);

/**
 * Single-character aliases, matched only as the trailing head noun of a compound.
 * Korean compounds put the head noun last (`메리노울` -> `울`, `양모` -> `모`), so
 * a suffix match is safe where a substring match would not be.
 */
const SUFFIX_ALIASES = ALIAS_NAMES.filter(
  alias => alias.length < SUBSTRING_ALIAS_MIN_LENGTH,
);

/**
 * Splits input into an ordered stream of word and number tokens.
 *
 * The PRD suggests a single `name-then-number` regex. Tokenizing instead lets us
 * also handle `80% 면` (ratio first) and skip section headers like `겉감:`,
 * both of which would otherwise silently attach a ratio to the wrong fiber.
 */
const TOKEN_PATTERN = /([\p{Script=Hangul}a-z]+)|(\d+(?:\.\d+)?)/giu;

type Token
  = | { readonly kind: 'word'; readonly text: string }
    | { readonly kind: 'number'; readonly percent: number };

function tokenize(input: string): Token[] {
  return [...input.matchAll(TOKEN_PATTERN)].map((match) => {
    const [, word, number] = match;

    return word !== undefined
      ? ({ kind: 'word', text: word } as const)
      : ({ kind: 'number', percent: Number(number) } as const);
  });
}

type FiberNameMatch = {
  readonly index: number;
  readonly text: string;
};

/**
 * Finds the fiber name belonging to the ratio at `numberIndex`.
 * Prefers the word directly before the ratio, then the word directly after it,
 * skipping words already claimed by an earlier ratio.
 */
function findFiberName(
  tokens: readonly Token[],
  numberIndex: number,
  claimed: ReadonlySet<number>,
): FiberNameMatch | null {
  for (const index of [numberIndex - 1, numberIndex + 1]) {
    const token = tokens[index];

    if (token?.kind === 'word' && !claimed.has(index)) {
      return { index, text: token.text };
    }
  }

  return null;
}

type FiberRatio = {
  readonly name: string;
  readonly percent: number;
};

function pairFibersWithRatios(tokens: readonly Token[]): FiberRatio[] {
  const claimed = new Set<number>();

  return tokens.reduce<FiberRatio[]>((pairs, token, index) => {
    if (token.kind !== 'number') {
      return pairs;
    }

    const name = findFiberName(tokens, index, claimed);

    if (!name) {
      return pairs;
    }

    claimed.add(name.index);

    return [...pairs, { name: name.text, percent: token.percent }];
  }, []);
}

/**
 * Resolves a compound fiber name that has no exact entry, e.g. `오가닉코튼` via
 * the embedded `코튼`, or `메리노울` via the trailing `울`.
 */
function findAliasInCompound(normalized: string): StandardFiber | null {
  const alias
    = SUBSTRING_ALIASES.find(candidate => normalized.includes(candidate))
      ?? SUFFIX_ALIASES.find(candidate => normalized.endsWith(candidate));

  return alias ? FIBER_ALIASES[alias] ?? null : null;
}

/**
 * Converts a raw fiber name into its legal standard name.
 * @param rawName Fiber name as typed by the user.
 * @returns The standard name, or the trimmed input when the fiber is unknown.
 */
export function standardizeFiberName(rawName: string): string {
  const trimmed = rawName.trim();

  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.toLowerCase();

  return FIBER_ALIASES[normalized] ?? findAliasInCompound(normalized) ?? trimmed;
}

/** Guards against float artifacts such as 97.5 + 2.5 drifting off 100. */
function roundPercent(percent: number): number {
  return Math.round(percent * 10) / 10;
}

/**
 * Extracts a standardized fabric composition from free-form text.
 * @param input Free-form composition text, e.g. `면 80% 폴리 20%`.
 * @returns Standard fiber name to percentage. Ratios outside 0-100 are discarded
 * and fibers that normalize to the same standard name are summed.
 */
export function parseFabricComposition(input: string): FabricComposition {
  if (!input.trim()) {
    return {};
  }

  const ratios = pairFibersWithRatios(tokenize(input));

  return ratios.reduce<FabricComposition>((composition, { name, percent }) => {
    if (percent <= 0 || percent > MAX_PERCENT) {
      return composition;
    }

    const fiber = standardizeFiberName(name);

    if (!fiber) {
      return composition;
    }

    return {
      ...composition,
      [fiber]: roundPercent((composition[fiber] ?? 0) + percent),
    };
  }, {});
}
