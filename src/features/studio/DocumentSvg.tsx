import type { DocElement, LabelDocument } from '@/utils/documentModel';
import {
  CARE_GLYPH_BOX,
  CARE_GLYPHS,
  CARE_SHAPES,
  PROHIBITION_STROKE,
} from '@/features/label/careSymbolShapes';
import { code128Symbol } from '@/utils/barcodeMatrix';
import { buildCareGuide } from '@/utils/careRules';
import { textLines } from '@/utils/documentModel';
import { parseFabricComposition } from '@/utils/fabricParser';
import { fontById } from '@/utils/fonts';
import { qrMatrix, qrRects } from '@/utils/qrMatrix';

const INK = '#111111';
const MUTED_INK = '#5a5a5a';
const GUIDE = '#bdbdbd';
const PAGE = '#ffffff';

function CareGlyphSvg({ code, x, size }: { code: string; x: number; size: number }) {
  const glyph = CARE_GLYPHS[code];

  if (!glyph) {
    return null;
  }

  const shape = CARE_SHAPES[glyph.shape];
  const scale = size / CARE_GLYPH_BOX;
  const showDetail = shape.detail && (!glyph.mark || glyph.shape === 'iron');

  return (
    <g transform={`translate(${x} 0) scale(${scale})`}>
      <path
        d={shape.outline}
        fill="none"
        stroke={INK}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {showDetail
        ? (
            <path
              d={shape.detail ?? ''}
              fill="none"
              stroke={INK}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          )
        : null}
      {glyph.mark
        ? (
            <text
              x={CARE_GLYPH_BOX / 2}
              y={shape.markY}
              fontSize={shape.markSize}
              fontWeight={600}
              textAnchor="middle"
              fill={INK}
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
              stroke={INK}
              strokeWidth={1.9}
              strokeLinecap="round"
            />
          )
        : null}
    </g>
  );
}

function ElementSvg({ element }: { element: DocElement }) {
  switch (element.type) {
    case 'text': {
      const anchor
        = element.align === 'center'
          ? 'middle'
          : element.align === 'right'
            ? 'end'
            : 'start';
      const anchorX
        = element.align === 'center'
          ? element.x + element.width / 2
          : element.align === 'right'
            ? element.x + element.width
            : element.x;

      const font = fontById(element.fontId);
      const decorations = [
        element.underline ? 'underline' : null,
        element.strike ? 'line-through' : null,
      ].filter(Boolean).join(' ');

      return (
        <text
          x={anchorX}
          y={element.y}
          textAnchor={anchor}
          dominantBaseline="hanging"
          fontFamily={font.cssStack}
          fontSize={element.fontSize}
          fontWeight={element.bold ? 700 : 400}
          fontStyle={element.italic && font.hasItalic ? 'italic' : 'normal'}
          textDecoration={decorations || undefined}
          letterSpacing={element.letterSpacing || undefined}
          fill={element.color ?? (element.muted ? MUTED_INK : INK)}
        >
          {textLines(element).map((line, index) => (
            <tspan
              key={line + String(index)}
              x={anchorX}
              dy={index === 0 ? 0 : element.fontSize * (element.lineHeight ?? 1.35)}
            >
              {line}
            </tspan>
          ))}
        </text>
      );
    }

    case 'rect':
      return (
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={element.radius ?? 0}
          fill="none"
          stroke={element.dashed ? GUIDE : INK}
          strokeWidth={0.2}
          strokeDasharray={element.dashed ? '0.8 0.6' : undefined}
        />
      );

    case 'divider':
      return (
        <line
          x1={element.x}
          y1={element.y}
          x2={element.x + element.width}
          y2={element.y}
          stroke={GUIDE}
          strokeWidth={0.2}
        />
      );

    case 'hole':
      return (
        <g>
          <circle
            cx={element.x + element.radius}
            cy={element.y + element.radius}
            r={element.radius}
            fill="none"
            stroke={INK}
            strokeWidth={0.2}
          />
          <circle
            cx={element.x + element.radius}
            cy={element.y + element.radius}
            r={element.radius * 2.2}
            fill="none"
            stroke={GUIDE}
            strokeWidth={0.15}
            strokeDasharray="0.7 0.5"
          />
        </g>
      );

    case 'barcode': {
      const symbol = code128Symbol(element.value);

      return (
        <g>
          {symbol
            ? (
                <g
                  transform={`translate(${element.x} ${element.y}) scale(${element.width / symbol.units} 1)`}
                >
                  {symbol.bars.map(bar => (
                    <rect
                      key={bar.x}
                      x={bar.x}
                      y={0}
                      width={bar.width}
                      height={element.height}
                      fill={INK}
                    />
                  ))}
                </g>
              )
            : null}
          {element.showValue
            ? (
                <text
                  x={element.x + element.width / 2}
                  y={element.y + element.height + 0.4}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fontSize={1.7}
                  fill={INK}
                >
                  {element.value}
                </text>
              )
            : null}
        </g>
      );
    }

    case 'image':
      return element.src
        ? (
            <image
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              href={element.src}
              preserveAspectRatio="xMidYMid meet"
            />
          )
        : (
            <rect
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              fill="none"
              stroke={GUIDE}
              strokeWidth={0.2}
              strokeDasharray="0.8 0.6"
            />
          );

    case 'careSymbols': {
      const guide = buildCareGuide(parseFabricComposition(element.composition));

      return (
        <g transform={`translate(${element.x} ${element.y})`}>
          {guide.symbols.map((symbol, index) => (
            <CareGlyphSvg
              key={symbol.category}
              code={symbol.code}
              x={index * (element.glyphWidth + element.gap)}
              size={element.glyphWidth}
            />
          ))}
        </g>
      );
    }

    case 'qr': {
      const matrix = qrMatrix(element.url);

      if (!matrix) {
        return null;
      }

      const step = element.size / matrix.size;

      return (
        <g>
          {qrRects(matrix).map(rect => (
            <rect
              key={`${rect.y}-${rect.x}`}
              x={element.x + rect.x * step}
              y={element.y + rect.y * step}
              width={rect.width * step}
              height={step}
              fill={INK}
            />
          ))}
        </g>
      );
    }

    default:
      return null;
  }
}

type DocumentSvgProps = {
  doc: LabelDocument;
  /** Rendered size in CSS pixels; the viewBox stays in millimetres. */
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Renders a document as plain SVG.
 *
 * Used for the template thumbnails. It has no interactivity and no Konva
 * dependency, so a thumbnail costs a fraction of a live canvas. It renders on
 * the client today because the studio shell is client-only; the component itself
 * is server-safe if the gallery is ever moved out of the shell.
 */
export const DocumentSvg = ({
  doc,
  width,
  height,
  className,
}: DocumentSvgProps) => (
  <svg
    className={className}
    width={width}
    height={height}
    viewBox={`0 0 ${doc.widthMm} ${doc.heightMm}`}
    fontFamily={fontById(undefined).cssStack}
    aria-hidden="true"
    focusable="false"
  >
    <rect
      x={0}
      y={0}
      width={doc.widthMm}
      height={doc.heightMm}
      fill={doc.backgroundColor ?? PAGE}
    />
    {doc.elements.map(element => (
      <ElementSvg key={element.id} element={element} />
    ))}
  </svg>
);
