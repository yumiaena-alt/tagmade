'use client';

import type Konva from 'konva';
import type { DocElement } from '@/utils/documentModel';
import { useEffect, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Line, Path, Rect, Stage, Text, Transformer } from 'react-konva';
import {
  CARE_GLYPH_BOX,
  CARE_GLYPHS,
  CARE_SHAPES,
  PROHIBITION_STROKE,
} from '@/features/label/careSymbolShapes';
import { useDocumentStore } from '@/store/useDocumentStore';
import { code128Symbol } from '@/utils/barcodeMatrix';
import { buildCareGuide } from '@/utils/careRules';
import { clampElement, elementSize, textLines } from '@/utils/documentModel';
import { parseFabricComposition } from '@/utils/fabricParser';
import { fontById } from '@/utils/fonts';
import { qrMatrix, qrRects } from '@/utils/qrMatrix';
import { setCanvasStage } from './canvasStage';

const INK = '#111111';
const MUTED_INK = '#5a5a5a';
const GUIDE = '#bdbdbd';
const FONT = 'Inter, "Malgun Gothic", sans-serif';

/** Anchor sets per element type: text only stretches horizontally. */
const TEXT_ANCHORS = ['middle-left', 'middle-right'];
const BOX_ANCHORS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'middle-left',
  'middle-right',
];

type CanvasGlyphProps = {
  code: string;
  x: number;
  size: number;
};

const CanvasGlyph = ({ code, x, size }: CanvasGlyphProps) => {
  const glyph = CARE_GLYPHS[code];

  if (!glyph) {
    return null;
  }

  const shape = CARE_SHAPES[glyph.shape];
  const scale = size / CARE_GLYPH_BOX;
  const showDetail = shape.detail && (!glyph.mark || glyph.shape === 'iron');

  return (
    <Group x={x} scaleX={scale} scaleY={scale} listening={false}>
      <Path data={shape.outline} stroke={INK} strokeWidth={1.4} lineJoin="round" />
      {showDetail
        ? <Path data={shape.detail} stroke={INK} strokeWidth={1.4} lineCap="round" />
        : null}
      {glyph.mark
        ? (
            <Text
              text={glyph.mark}
              y={shape.markY - shape.markSize * 0.86}
              width={CARE_GLYPH_BOX}
              align="center"
              fontSize={shape.markSize}
              fontStyle="bold"
              fontFamily={FONT}
              fill={INK}
            />
          )
        : null}
      {glyph.prohibited
        ? (
            <Line
              points={[
                PROHIBITION_STROKE.from.x,
                PROHIBITION_STROKE.from.y,
                PROHIBITION_STROKE.to.x,
                PROHIBITION_STROKE.to.y,
              ]}
              stroke={INK}
              strokeWidth={1.9}
              lineCap="round"
            />
          )
        : null}
    </Group>
  );
};

type ElementNodeProps = {
  element: DocElement;
  scale: number;
  /** Loaded bitmap for an image element, keyed by src in the parent. */
  image: HTMLImageElement | null;
};

/** Draws one element's contents; positioning and interaction live in the parent. */
const ElementBody = ({ element, scale, image }: ElementNodeProps) => {
  const mm = (value: number) => value * scale;

  switch (element.type) {
    case 'text': {
      const font = fontById(element.fontId);
      const isItalic = Boolean(element.italic) && font.hasItalic;
      const decorations = [
        element.underline ? 'underline' : null,
        element.strike ? 'line-through' : null,
      ].filter(Boolean).join(' ');

      return (
        <Text
          text={textLines(element).join('\n')}
          width={mm(element.width)}
          align={element.align ?? 'left'}
          fontSize={mm(element.fontSize)}
          fontStyle={
            [element.bold ? 'bold' : null, isItalic ? 'italic' : null]
              .filter(Boolean)
              .join(' ') || 'normal'
          }
          textDecoration={decorations}
          letterSpacing={mm(element.letterSpacing ?? 0)}
          fontFamily={font.cssStack}
          lineHeight={element.lineHeight ?? 1.35}
          fill={element.color ?? (element.muted ? MUTED_INK : INK)}
        />
      );
    }

    case 'rect':
      return (
        <Rect
          width={mm(element.width)}
          height={mm(element.height)}
          cornerRadius={mm(element.radius ?? 0)}
          stroke={element.dashed ? GUIDE : INK}
          strokeWidth={1}
          dash={element.dashed ? [4, 3] : undefined}
        />
      );

    case 'divider':
      return (
        <Line points={[0, 0, mm(element.width), 0]} stroke={GUIDE} strokeWidth={1} />
      );

    case 'hole':
      return (
        <Group>
          <Circle
            x={mm(element.radius)}
            y={mm(element.radius)}
            radius={mm(element.radius)}
            stroke={INK}
            strokeWidth={1}
          />
          <Circle
            x={mm(element.radius)}
            y={mm(element.radius)}
            radius={mm(element.radius * 2.2)}
            stroke={GUIDE}
            strokeWidth={1}
            dash={[4, 3]}
          />
        </Group>
      );

    case 'barcode': {
      const symbol = code128Symbol(element.value);

      return (
        <Group>
          {symbol
            ? (
                <Group scaleX={mm(element.width) / symbol.units}>
                  {symbol.bars.map(bar => (
                    <Rect
                      key={bar.x}
                      x={bar.x}
                      width={bar.width}
                      height={mm(element.height)}
                      fill={INK}
                    />
                  ))}
                </Group>
              )
            : (
                <Rect
                  width={mm(element.width)}
                  height={mm(element.height)}
                  stroke={GUIDE}
                  strokeWidth={1}
                  dash={[4, 3]}
                />
              )}
          {element.showValue
            ? (
                <Text
                  text={element.value}
                  y={mm(element.height + 0.4)}
                  width={mm(element.width)}
                  align="center"
                  fontSize={mm(1.7)}
                  fontFamily={FONT}
                  fill={INK}
                />
              )
            : null}
        </Group>
      );
    }

    case 'image':
      return image
        ? (
            <KonvaImage
              image={image}
              width={mm(element.width)}
              height={mm(element.height)}
            />
          )
        : (
            <Rect
              width={mm(element.width)}
              height={mm(element.height)}
              stroke={GUIDE}
              strokeWidth={1}
              dash={[4, 3]}
            />
          );

    case 'careSymbols': {
      const guide = buildCareGuide(parseFabricComposition(element.composition));

      return (
        <Group>
          {guide.symbols.map((symbol, index) => (
            <CanvasGlyph
              key={symbol.category}
              code={symbol.code}
              x={mm(index * (element.glyphWidth + element.gap))}
              size={mm(element.glyphWidth)}
            />
          ))}
        </Group>
      );
    }

    case 'qr': {
      const matrix = qrMatrix(element.url);

      if (!matrix) {
        return (
          <Rect
            width={mm(element.size)}
            height={mm(element.size)}
            stroke={GUIDE}
            strokeWidth={1}
            dash={[4, 3]}
          />
        );
      }

      const step = mm(element.size) / matrix.size;

      return (
        <Group>
          {qrRects(matrix).map(rect => (
            <Rect
              key={`${rect.y}-${rect.x}`}
              x={rect.x * step}
              y={rect.y * step}
              width={rect.width * step}
              height={step}
              fill={INK}
            />
          ))}
        </Group>
      );
    }

    default:
      return null;
  }
};

/** Converts a transform gesture into millimetre dimensions for the element. */
function resizePatch(
  element: DocElement,
  node: Konva.Node,
  scale: number,
): Partial<DocElement> {
  const widthMm = (node.width() * node.scaleX()) / scale;
  const heightMm = (node.height() * node.scaleY()) / scale;

  node.scaleX(1);
  node.scaleY(1);

  switch (element.type) {
    case 'text':
      return { width: Math.max(4, widthMm) };
    case 'rect':
      return { width: Math.max(2, widthMm), height: Math.max(2, heightMm) };
    case 'divider':
      return { width: Math.max(2, widthMm) };
    case 'barcode':
      return { width: Math.max(8, widthMm), height: Math.max(4, heightMm) };
    case 'qr':
      return { size: Math.max(6, widthMm) };
    case 'careSymbols':
      return { glyphWidth: Math.max(2, widthMm / 5.8) };
    default:
      return {};
  }
}

type DocumentCanvasProps = {
  /** Preview pixels per millimetre. */
  scale: number;
};

/**
 * Interactive canvas. Everything is editable in place: click to select, drag to
 * move, pull the handles to resize, double-click text to retype it, Delete to
 * remove. Every gesture writes straight to the document store, which is the same
 * data the left panel edits.
 */
export const DocumentCanvas = ({ scale }: DocumentCanvasProps) => {
  const doc = useDocumentStore(state => state.doc);
  const selectedId = useDocumentStore(state => state.selectedId);
  const select = useDocumentStore(state => state.select);
  const moveElement = useDocumentStore(state => state.moveElement);
  const updateElement = useDocumentStore(state => state.updateElement);
  const removeElement = useDocumentStore(state => state.removeElement);
  const setElementContent = useDocumentStore(state => state.setElementContent);

  const transformerRef = useRef<Konva.Transformer>(null);
  const nodesRef = useRef(new Map<string, Konva.Group>());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

  // Konva needs a decoded bitmap, so each image element's data URL is loaded
  // once and cached by src.
  const imageSources = doc.elements
    .filter(element => element.type === 'image' && element.src.length > 0)
    .map(element => (element.type === 'image' ? element.src : ''))
    .join(' ');

  useEffect(() => {
    const sources = imageSources.split(' ').filter(Boolean);

    sources.forEach((src) => {
      setImages((current) => {
        if (current[src]) {
          return current;
        }

        const bitmap = new Image();

        bitmap.onload = () => setImages(next => ({ ...next, [src]: bitmap }));
        bitmap.src = src;

        return current;
      });
    });
  }, [imageSources]);

  // Keep the transform handles attached to whatever is selected.
  useEffect(() => {
    const transformer = transformerRef.current;

    if (!transformer) {
      return;
    }

    const node = selectedId ? nodesRef.current.get(selectedId) : undefined;

    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, doc.elements]);

  // Delete removes the selection, Escape clears it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping
        = target
          && (target.tagName === 'INPUT'
            || target.tagName === 'TEXTAREA'
            || target.isContentEditable);

      if (isTyping || !selectedId) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeElement(selectedId);
      }

      if (event.key === 'Escape') {
        select(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, removeElement, select]);

  const width = doc.widthMm * scale;
  const height = doc.heightMm * scale;
  const editing = doc.elements.find(element => element.id === editingId);

  return (
    <div className="relative" style={{ width, height }}>
      <Stage
        ref={setCanvasStage}
        width={width}
        height={height}
        onMouseDown={(event) => {
          // A click on empty canvas clears the selection, like any editor.
          if (event.target === event.target.getStage()) {
            select(null);
          }
        }}
      >
        <Layer>
          <Rect
            width={width}
            height={height}
            fill={doc.backgroundColor ?? '#ffffff'}
            stroke="#d4d4d4"
            strokeWidth={1}
          />

          {doc.elements.map(element => (
            <Group
              key={element.id}
              ref={(node) => {
                if (node) {
                  nodesRef.current.set(element.id, node);
                } else {
                  nodesRef.current.delete(element.id);
                }
              }}
              x={element.x * scale}
              y={element.y * scale}
              draggable={!element.locked}
              listening={!element.locked}
              onMouseDown={() => select(element.id)}
              onTouchStart={() => select(element.id)}
              onDblClick={() =>
                element.type === 'text' ? setEditingId(element.id) : undefined}
              onDragEnd={(event) => {
                const next = clampElement(element, doc, {
                  x: event.target.x() / scale,
                  y: event.target.y() / scale,
                });

                event.target.position({ x: next.x * scale, y: next.y * scale });
                moveElement(element.id, next);
              }}
              onTransformEnd={(event) => {
                updateElement(element.id, resizePatch(element, event.target, scale));
                event.target.position({
                  x: element.x * scale,
                  y: element.y * scale,
                });
              }}
            >
              <ElementBody
                element={element}
                scale={scale}
                image={
                  element.type === 'image' ? images[element.src] ?? null : null
                }
              />
            </Group>
          ))}

          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            keepRatio={false}
            borderStroke="#4f46e5"
            anchorStroke="#4f46e5"
            anchorSize={8}
            enabledAnchors={
              doc.elements.find(element => element.id === selectedId)?.type === 'text'
                ? TEXT_ANCHORS
                : BOX_ANCHORS
            }
          />
        </Layer>
      </Stage>

      {/*
        Inline text editing: a textarea sits exactly over the Konva text while it
        is being retyped, so the user edits where they are looking.
      */}
      {editing && editing.type === 'text'
        ? (
            <textarea
              autoFocus
              value={editing.text}
              onChange={event => setElementContent(editing.id, event.target.value)}
              onBlur={() => setEditingId(null)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setEditingId(null);
                }
              }}
              className={`
                absolute z-10 resize-none overflow-hidden rounded-sm border
                border-indigo-500 bg-white/95 p-0 text-black outline-none
              `}
              style={{
                left: editing.x * scale,
                top: editing.y * scale,
                width: editing.width * scale,
                height: Math.max(
                  editing.fontSize * scale * 1.4,
                  elementSize(editing).height * scale,
                ),
                fontSize: editing.fontSize * scale,
                fontWeight: editing.bold ? 700 : 400,
                lineHeight: String(editing.lineHeight ?? 1.35),
                fontFamily: FONT,
                textAlign: editing.align ?? 'left',
              }}
            />
          )
        : null}
    </div>
  );
};
