import {
  CARE_GLYPH_BOX,
  CARE_GLYPHS,
  CARE_SHAPES,
  PROHIBITION_STROKE,
} from './careSymbolShapes';

type CareSymbolIconProps = {
  /** Icon code produced by `buildCareGuide`. */
  code: string;
  /** Rendered edge length in pixels. */
  size?: number;
  className?: string;
};

/** Renders one KS-style care pictogram as inline SVG. */
export const CareSymbolIcon = ({
  code,
  size = 40,
  className,
}: CareSymbolIconProps) => {
  const glyph = CARE_GLYPHS[code];

  if (!glyph) {
    return null;
  }

  const shape = CARE_SHAPES[glyph.shape];

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${CARE_GLYPH_BOX} ${CARE_GLYPH_BOX}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={shape.outline} />

      {!glyph.mark && shape.detail ? <path d={shape.detail} /> : null}
      {glyph.mark && shape.detail && glyph.shape === 'iron'
        ? <path d={shape.detail} />
        : null}

      {glyph.mark
        ? (
            <text
              x={CARE_GLYPH_BOX / 2}
              y={shape.markY}
              fontSize={shape.markSize}
              fontWeight={600}
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
            >
              {glyph.mark}
            </text>
          )
        : null}

      {glyph.prohibited
        ? (
            <line
              x1={PROHIBITION_STROKE.from.x}
              y1={PROHIBITION_STROKE.from.y}
              x2={PROHIBITION_STROKE.to.x}
              y2={PROHIBITION_STROKE.to.y}
              strokeWidth={1.9}
            />
          )
        : null}
    </svg>
  );
};
