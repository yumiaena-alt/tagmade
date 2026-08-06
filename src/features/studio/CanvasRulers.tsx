'use client';

/** Ruler thickness in CSS pixels. */
export const RULER_SIZE = 20;

const TICK_COLOR = 'currentColor';

/** Picks a label interval that keeps numbers readable at the current zoom. */
function labelStepMm(pxPerMm: number): number {
  const candidates = [1, 2, 5, 10, 20, 50, 100];
  const minPxBetweenLabels = 44;

  return (
    candidates.find(step => step * pxPerMm >= minPxBetweenLabels)
    ?? candidates[candidates.length - 1]!
  );
}

type RulerProps = {
  /** Length of the ruled edge in millimetres. */
  lengthMm: number;
  /** Screen pixels per millimetre, zoom included. */
  pxPerMm: number;
  orientation: 'horizontal' | 'vertical';
};

/**
 * Millimetre ruler along one edge of the workspace.
 *
 * Drawn as SVG so ticks stay crisp at any zoom, and derived purely from
 * `pxPerMm` — the same number the canvas scales by, so the two can never drift.
 */
export const CanvasRuler = ({ lengthMm, pxPerMm, orientation }: RulerProps) => {
  const isHorizontal = orientation === 'horizontal';
  const lengthPx = Math.max(1, lengthMm * pxPerMm);
  const step = labelStepMm(pxPerMm);
  const minorStep = step / 2;

  const ticks = [];

  for (let mm = 0; mm <= lengthMm + 0.001; mm += minorStep) {
    const isMajor = Math.abs(mm % step) < 0.001;
    const at = mm * pxPerMm;
    const depth = isMajor ? RULER_SIZE * 0.55 : RULER_SIZE * 0.3;

    ticks.push(
      <line
        key={mm}
        x1={isHorizontal ? at : RULER_SIZE - depth}
        y1={isHorizontal ? RULER_SIZE - depth : at}
        x2={isHorizontal ? at : RULER_SIZE}
        y2={isHorizontal ? RULER_SIZE : at}
        stroke={TICK_COLOR}
        strokeWidth={1}
        opacity={isMajor ? 0.55 : 0.3}
      />,
    );

    if (isMajor && mm > 0) {
      ticks.push(
        <text
          key={`label-${mm}`}
          x={isHorizontal ? at + 2 : RULER_SIZE - 3}
          y={isHorizontal ? 8 : at - 2}
          fontSize={8}
          fill={TICK_COLOR}
          opacity={0.75}
          textAnchor={isHorizontal ? 'start' : 'end'}
          transform={isHorizontal ? undefined : `rotate(-90 ${RULER_SIZE - 3} ${at - 2})`}
        >
          {Math.round(mm)}
        </text>,
      );
    }
  }

  return (
    <svg
      width={isHorizontal ? lengthPx : RULER_SIZE}
      height={isHorizontal ? RULER_SIZE : lengthPx}
      className="shrink-0 text-muted-foreground"
      aria-hidden="true"
    >
      {ticks}
    </svg>
  );
};
