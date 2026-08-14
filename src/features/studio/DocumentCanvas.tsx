'use client';

import type Konva from 'konva';
import type { AlignmentGuide } from '@/utils/alignmentGuides';
import type { DocElement } from '@/utils/documentModel';
import { useEffect, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Line, Path, Rect, Stage, Text, Transformer } from 'react-konva';
import {
  CARE_GLYPH_BOX,
  CARE_GLYPHS,
  CARE_SHAPES,
  PROHIBITION_STROKE,
} from '@/features/label/careSymbolShapes';
import { useActiveElements, useDocumentStore } from '@/store/useDocumentStore';
import { useViewStore } from '@/store/useViewStore';
import {
  alignmentTargets,
  SNAP_TOLERANCE_PX,
  snapEdge,
  snapPosition,
} from '@/utils/alignmentGuides';
import { code128Symbol } from '@/utils/barcodeMatrix';
import { buildCareGuide } from '@/utils/careRules';
import {
  clampElement,
  elementSize,
  resizedElement,
  textLines,
  visibleElements,
} from '@/utils/documentModel';
import { parseFabricComposition } from '@/utils/fabricParser';
import { fontById } from '@/utils/fonts';
import { qrMatrix, qrRects } from '@/utils/qrMatrix';
import { setCanvasStage } from './canvasStage';

const INK = '#111111';
const MUTED_INK = '#5a5a5a';
const GUIDE = '#bdbdbd';
const FONT = 'Inter, "Malgun Gothic", sans-serif';

/**
 * Alignment guides, in a colour used for nothing else.
 *
 * Deliberately not the indigo of the selection box: a guide is a statement
 * about two things lining up, not about what is selected, and sharing a colour
 * made the two read as one highlight.
 */
const SNAP_GUIDE = '#f43f5e';

/**
 * Arrow-key step, in millimetres, and the bigger one Shift asks for.
 *
 * A millimetre because that is the unit the whole document is in and the one a
 * printer will quote back; anything finer is a number nobody chose. Shift takes
 * the same step five times over, for crossing a label rather than closing a gap.
 */
const NUDGE_MM = 1;
const NUDGE_FAR_MM = 5;

const NUDGE_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/**
 * True when two guide sets would draw the same lines.
 *
 * A drag fires a move event per pointer sample. Without this the canvas would
 * re-render on every one of them; with it, React only re-renders on the frames
 * where a snap actually engages or lets go.
 */
function sameGuides(
  a: readonly AlignmentGuide[],
  b: readonly AlignmentGuide[],
): boolean {
  return a.length === b.length
    && a.every((guide, index) =>
      guide.orientation === b[index]?.orientation && guide.at === b[index]?.at);
}

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
        ? (() => {
            // Letterboxed inside the box, matching `preserveAspectRatio` in the
            // thumbnail and `objectFit: contain` in the PDF. Konva stretches by
            // default, which had the canvas showing a distorted picture that
            // came out of the printer undistorted — worst of all for the KC
            // mark, a designated figure that may not be reproportioned.
            const box = { width: mm(element.width), height: mm(element.height) };
            const fit = Math.min(
              box.width / image.naturalWidth,
              box.height / image.naturalHeight,
            );
            const drawn = {
              width: image.naturalWidth * fit,
              height: image.naturalHeight * fit,
            };

            return (
              <KonvaImage
                image={image}
                x={(box.width - drawn.width) / 2}
                y={(box.height - drawn.height) / 2}
                width={drawn.width}
                height={drawn.height}
              />
            );
          })()
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

/**
 * Reads a transform gesture off the node and hands it to the model.
 *
 * The node carries the change as a scale factor and nothing else, so the
 * factors are taken and immediately reset — leaving them on would compound
 * with the next gesture and with the redraw that follows the store update.
 */
function resizePatch(element: DocElement, node: Konva.Node): Partial<DocElement> {
  const factorX = node.scaleX();
  const factorY = node.scaleY();

  node.scaleX(1);
  node.scaleY(1);

  return resizedElement(element, factorX, factorY);
}

/** Which side of the box the operator has hold of, per axis. */
type HeldEdges = {
  readonly x: 'start' | 'end' | null;
  readonly y: 'start' | 'end' | null;
};

/**
 * Reads the grabbed anchor's name as the edges it moves.
 *
 * Konva names anchors by position — `middle-left`, `bottom-right` — and a
 * resize only ever moves the sides the name mentions. A middle handle leaves
 * one axis alone, which is why each axis is nullable.
 */
function heldEdges(anchor: string): HeldEdges {
  return {
    x: anchor.includes('left')
      ? 'start'
      : anchor.includes('right')
        ? 'end'
        : null,
    y: anchor.includes('top')
      ? 'start'
      : anchor.includes('bottom')
        ? 'end'
        : null,
  };
}

/** Smallest side a snap may leave behind, in millimetres. */
const MIN_SIDE_MM = 1;

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
  // The layer list gets the whole page — hiding something has to be reversible,
  // and the list is the only place it can be brought back from. The canvas gets
  // only what is meant to be drawn.
  const elements = visibleElements(useActiveElements());
  const selectedId = useDocumentStore(state => state.selectedId);
  const select = useDocumentStore(state => state.select);
  const moveElement = useDocumentStore(state => state.moveElement);
  const updateElement = useDocumentStore(state => state.updateElement);
  const removeElement = useDocumentStore(state => state.removeElement);
  const duplicateElement = useDocumentStore(state => state.duplicateElement);
  const nudgeElement = useDocumentStore(state => state.nudgeElement);
  const setElementContent = useDocumentStore(state => state.setElementContent);
  const gridStepMm = useViewStore(state => state.gridStepMm);
  const gridSnapping = useViewStore(state => state.snapToGrid);

  const transformerRef = useRef<Konva.Transformer>(null);
  const nodesRef = useRef(new Map<string, Konva.Group>());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [guides, setGuides] = useState<readonly AlignmentGuide[]>([]);

  // Konva needs a decoded bitmap, so each image element's data URL is loaded
  // once and cached by src.
  const imageSources = elements
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
  }, [selectedId, elements]);

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

      // Ctrl/Cmd+D. The browser's own bookmark dialog has to be refused, or
      // duplicating an element also opens it.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateElement(selectedId);
      }

      const direction = NUDGE_DIRECTIONS[event.key];

      if (direction) {
        // Otherwise the arrows scroll the workspace out from under the label.
        event.preventDefault();

        const step = event.shiftKey ? NUDGE_FAR_MM : NUDGE_MM;

        nudgeElement(selectedId, {
          x: direction.x * step,
          y: direction.y * step,
        });
      }

      if (event.key === 'Escape') {
        select(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, removeElement, duplicateElement, nudgeElement, select]);

  const width = doc.widthMm * scale;
  const height = doc.heightMm * scale;
  const editing = elements.find(element => element.id === editingId);

  /**
   * Where a dragged element should actually come to rest: snapped to whatever
   * it nearly lines up with, then held inside the page.
   *
   * Clamping comes last so the page edge always wins — but the page's own edges
   * are snap targets too, so the two rarely disagree.
   *
   * @param bypass Held Alt. Every editor lets you overrule the magnet, and
   * without it there are positions near an edge you simply cannot express.
   */
  const settle = (
    element: DocElement,
    node: Konva.Node,
    bypass: boolean,
  ): { x: number; y: number } => {
    const dropped = { x: node.x() / scale, y: node.y() / scale };

    if (bypass) {
      setGuides(current => (current.length === 0 ? current : []));

      return clampElement(element, doc, dropped);
    }

    const snapped = snapPosition(
      element,
      elements.filter(other => other.id !== element.id),
      doc,
      dropped,
      // A pointing tolerance, so it is fixed on screen and shrinks in
      // millimetres as the operator zooms in.
      SNAP_TOLERANCE_PX / scale,
      // The grid is the fallback, and only on an axis nothing else claimed.
      gridSnapping ? gridStepMm : 0,
    );

    setGuides(current =>
      sameGuides(current, snapped.guides) ? current : snapped.guides);

    return clampElement(element, doc, snapped.position);
  };

  /**
   * Pulls the edge being dragged by a handle onto whatever it nearly lines up
   * with, leaving the opposite edge exactly where it is.
   *
   * A resize is not a move: shifting the whole box the way `settle` does would
   * drag the fixed side along with it and change nothing about the size. So the
   * held edge is snapped on its own and the difference is folded back into the
   * node's scale, which is the only thing the transformer has written.
   *
   * @param bypass Held Alt, same escape hatch a drag has.
   */
  const settleResize = (
    element: DocElement,
    node: Konva.Node,
    bypass: boolean,
  ): void => {
    const anchor = transformerRef.current?.getActiveAnchor();

    if (bypass || !anchor) {
      setGuides(current => (current.length === 0 ? current : []));

      return;
    }

    const base = elementSize(element);
    const held = heldEdges(anchor);
    const tolerance = SNAP_TOLERANCE_PX / scale;
    const targets = alignmentTargets(
      elements.filter(other => other.id !== element.id),
      doc,
    );

    const box = {
      left: node.x() / scale,
      top: node.y() / scale,
      width: base.width * node.scaleX(),
      height: base.height * node.scaleY(),
    };

    const next: AlignmentGuide[] = [];

    if (held.x && base.width > 0) {
      const isStart = held.x === 'start';
      const edge = isStart ? box.left : box.left + box.width;
      const snap = snapEdge(edge, targets.x, tolerance);
      // Moving the leading edge takes the width with it; moving the trailing
      // edge adds to it. Either way the other side must not move.
      const width = snap
        ? (isStart ? box.width - snap.shift : box.width + snap.shift)
        : 0;

      if (snap && width >= MIN_SIDE_MM) {
        if (isStart) {
          node.x(snap.at * scale);
        }

        node.scaleX(width / base.width);
        next.push({ orientation: 'vertical', at: snap.at });
      }
    }

    if (held.y && base.height > 0) {
      const isStart = held.y === 'start';
      const edge = isStart ? box.top : box.top + box.height;
      const snap = snapEdge(edge, targets.y, tolerance);
      const height = snap
        ? (isStart ? box.height - snap.shift : box.height + snap.shift)
        : 0;

      if (snap && height >= MIN_SIDE_MM) {
        if (isStart) {
          node.y(snap.at * scale);
        }

        node.scaleY(height / base.height);
        next.push({ orientation: 'horizontal', at: snap.at });
      }
    }

    setGuides(current => (sameGuides(current, next) ? current : next));
  };

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

          {elements.map(element => (
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
              onDragMove={(event) => {
                const next = settle(element, event.target, event.evt.altKey);

                event.target.position({ x: next.x * scale, y: next.y * scale });
              }}
              onDragEnd={(event) => {
                const next = settle(element, event.target, event.evt.altKey);

                event.target.position({ x: next.x * scale, y: next.y * scale });
                moveElement(element.id, next);
                setGuides([]);
              }}
              onTransform={(event) => {
                settleResize(
                  element,
                  event.target,
                  Boolean((event.evt as MouseEvent | undefined)?.altKey),
                );
              }}
              onTransformEnd={(event) => {
                // The leading-edge case has already moved the node, and that
                // move is part of the result — read it back before the patch
                // resets the scale.
                const moved = {
                  x: event.target.x() / scale,
                  y: event.target.y() / scale,
                };
                const patch = resizePatch(element, event.target);

                updateElement(element.id, { ...patch, ...moved });
                event.target.position({ x: moved.x * scale, y: moved.y * scale });
                setGuides([]);
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

          {/*
            Alignment feedback, drawn above the artwork and below the handles so
            a guide is never hidden by the thing it is describing.
          */}
          {guides.map(guide => (
            <Line
              key={`${guide.orientation}-${guide.at}`}
              points={
                guide.orientation === 'vertical'
                  ? [guide.at * scale, 0, guide.at * scale, height]
                  : [0, guide.at * scale, width, guide.at * scale]
              }
              stroke={SNAP_GUIDE}
              strokeWidth={1}
              dash={[4, 3]}
              listening={false}
            />
          ))}

          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            keepRatio={false}
            borderStroke="#4f46e5"
            anchorStroke="#4f46e5"
            anchorSize={8}
            enabledAnchors={
              elements.find(element => element.id === selectedId)?.type === 'text'
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
