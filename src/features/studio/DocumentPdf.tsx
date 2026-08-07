import type { DocElement, LabelDocument } from '@/utils/documentModel';
import {
  Circle,
  Document,
  Line,
  Page,
  Path,
  Image as PdfImage,
  Rect,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer';
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
import { PDF_FONT_FAMILY, registerPdfFonts } from './pdfFont';

const INK = '#111111';
const MUTED_INK = '#5a5a5a';
const GUIDE = '#bdbdbd';

/** 1mm in PostScript points. */
const MM_TO_PT = 72 / 25.4;

function pt(mm: number): number {
  return mm * MM_TO_PT;
}

const PdfCareGlyph = ({ code, size }: { code: string; size: number }) => {
  const glyph = CARE_GLYPHS[code];

  if (!glyph) {
    return null;
  }

  const shape = CARE_SHAPES[glyph.shape];
  const scale = size / CARE_GLYPH_BOX;
  const showDetail = shape.detail && (!glyph.mark || glyph.shape === 'iron');

  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${CARE_GLYPH_BOX} ${CARE_GLYPH_BOX}`}>
        <Path d={shape.outline} stroke={INK} strokeWidth={1.4} fill="none" />
        {showDetail
          ? <Path d={shape.detail ?? ''} stroke={INK} strokeWidth={1.4} fill="none" />
          : null}
        {glyph.prohibited
          ? (
              <Line
                x1={PROHIBITION_STROKE.from.x}
                y1={PROHIBITION_STROKE.from.y}
                x2={PROHIBITION_STROKE.to.x}
                y2={PROHIBITION_STROKE.to.y}
                stroke={INK}
                strokeWidth={1.9}
              />
            )
          : null}
      </Svg>

      {glyph.mark
        ? (
            <Text
              style={{
                position: 'absolute',
                top: (shape.markY - shape.markSize) * scale,
                left: 0,
                width: size,
                textAlign: 'center',
                fontSize: shape.markSize * scale,
                fontWeight: 'bold',
              }}
            >
              {glyph.mark}
            </Text>
          )
        : null}
    </View>
  );
};

type ElementPdfProps = {
  element: DocElement;
};

const ElementPdf = ({ element }: ElementPdfProps) => {
  const at = {
    position: 'absolute' as const,
    left: pt(element.x),
    top: pt(element.y),
  };

  switch (element.type) {
    case 'text': {
      const font = fontById(element.fontId);
      // Spelled out rather than joined, because `@react-pdf` accepts only these
      // exact strings.
      const decoration = element.underline && element.strike
        ? 'underline line-through'
        : element.underline
          ? 'underline'
          : element.strike
            ? 'line-through'
            : 'none';

      return (
        <View style={{ ...at, width: pt(element.width) }}>
          {textLines(element).map((line, index) => (
            <Text
              key={line + String(index)}
              style={{
                fontFamily: font.family,
                fontSize: pt(element.fontSize),
                fontWeight: element.bold ? 'bold' : 'normal',
                // Only ask for a face that exists; @react-pdf throws rather
                // than falling back when a style is not registered.
                fontStyle:
                  element.italic && font.hasItalic ? 'italic' : 'normal',
                textDecoration: decoration,
                letterSpacing: pt(element.letterSpacing ?? 0),
                textAlign: element.align ?? 'left',
                color: element.color ?? (element.muted ? MUTED_INK : INK),
                lineHeight: element.lineHeight ?? 1.35,
              }}
            >
              {line}
            </Text>
          ))}
        </View>
      );
    }

    case 'rect':
      return (
        <View
          style={{
            ...at,
            width: pt(element.width),
            height: pt(element.height),
            borderWidth: 0.6,
            borderColor: element.dashed ? GUIDE : INK,
            borderStyle: element.dashed ? 'dashed' : 'solid',
            borderRadius: pt(element.radius ?? 0),
          }}
        />
      );

    case 'divider':
      return (
        <View
          style={{
            ...at,
            width: pt(element.width),
            borderTopWidth: 0.6,
            borderTopColor: GUIDE,
          }}
        />
      );

    case 'hole':
      return (
        <View style={at}>
          <Svg
            width={pt(element.radius * 4.4)}
            height={pt(element.radius * 4.4)}
            viewBox={`0 0 ${element.radius * 4.4} ${element.radius * 4.4}`}
          >
            <Circle
              cx={element.radius * 2.2}
              cy={element.radius * 2.2}
              r={element.radius}
              stroke={INK}
              strokeWidth={0.2}
              fill="none"
            />
          </Svg>
        </View>
      );

    case 'barcode': {
      const symbol = code128Symbol(element.value);

      return (
        // Explicit size: an auto-sized absolute View can collapse and clip the
        // Svg away, which silently drops every bar from the output.
        <View style={{ ...at, width: pt(element.width) }}>
          {symbol
            ? (
                <Svg
                  width={pt(element.width)}
                  height={pt(element.height)}
                  viewBox={`0 0 ${symbol.units} ${element.height}`}
                  preserveAspectRatio="none"
                >
                  {symbol.bars.map(bar => (
                    <Rect
                      key={bar.x}
                      x={bar.x}
                      y={0}
                      width={bar.width}
                      height={element.height}
                      fill={INK}
                    />
                  ))}
                </Svg>
              )
            : null}

          {element.showValue
            ? (
                <Text
                  style={{
                    marginTop: pt(0.4),
                    width: pt(element.width),
                    textAlign: 'center',
                    fontSize: pt(1.7),
                    color: INK,
                  }}
                >
                  {element.value}
                </Text>
              )
            : null}
        </View>
      );
    }

    case 'image':
      return element.src
        ? (
            <View
              style={{ ...at, width: pt(element.width), height: pt(element.height) }}
            >
              <PdfImage
                src={element.src}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </View>
          )
        : null;

    case 'careSymbols': {
      const guide = buildCareGuide(parseFabricComposition(element.composition));

      return (
        <View style={{ ...at, flexDirection: 'row' }}>
          {guide.symbols.map((symbol, index) => (
            <View
              key={symbol.category}
              style={index === 0 ? undefined : { marginLeft: pt(element.gap) }}
            >
              <PdfCareGlyph code={symbol.code} size={pt(element.glyphWidth)} />
            </View>
          ))}
        </View>
      );
    }

    case 'qr': {
      const matrix = qrMatrix(element.url);

      if (!matrix) {
        return null;
      }

      return (
        <View style={{ ...at, width: pt(element.size), height: pt(element.size) }}>
          <Svg
            width={pt(element.size)}
            height={pt(element.size)}
            viewBox={`0 0 ${matrix.size} ${matrix.size}`}
          >
            {qrRects(matrix).map(rect => (
              <Rect
                key={`${rect.y}-${rect.x}`}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={1}
                fill={INK}
              />
            ))}
          </Svg>
        </View>
      );
    }

    default:
      return null;
  }
};

type DocumentPdfProps = {
  doc: LabelDocument;
  title: string;
};

/**
 * Print-ready PDF for any studio document.
 *
 * Text stays text and barcodes are emitted as vector rectangles, so output is
 * resolution-independent rather than a screen capture. The page size is the
 * document's own millimetre size converted to points, so the file prints at
 * exactly the size shown on the canvas.
 */
export const DocumentPdf = ({ doc, title }: DocumentPdfProps) => {
  registerPdfFonts(doc);

  return (
    <Document title={title}>
      <Page
        size={[pt(doc.widthMm), pt(doc.heightMm)]}
        style={{
          backgroundColor: doc.backgroundColor ?? '#ffffff',
          fontFamily: PDF_FONT_FAMILY,
          color: INK,
        }}
      >
        {doc.elements.map(element => (
          <ElementPdf key={element.id} element={element} />
        ))}
      </Page>
    </Document>
  );
};
