/**
 * Viewport preferences: zoom, ruler visibility, and the unit the property panel
 * displays.
 *
 * Deliberately separate from `useDocumentStore`. These are how the operator is
 * looking* at the artwork, not part of it — so switching template or exporting
 * a PDF is unaffected, and later additions (multi-page, a mock-up view, grid
 * snapping) belong here rather than in the document.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Units the page-size fields can be edited in. Geometry stays millimetres. */
export const DISPLAY_UNITS = ['mm', 'px', 'inch'] as const;

export type DisplayUnit = typeof DISPLAY_UNITS[number];

/** Screen pixels per millimetre at 100% zoom (96dpi CSS reference). */
export const PX_PER_MM = 96 / 25.4;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

/** Converts a millimetre value into the unit the panel is showing. */
export function fromMm(mm: number, unit: DisplayUnit): number {
  switch (unit) {
    case 'px':
      return Math.round(mm * PX_PER_MM);
    case 'inch':
      return Math.round((mm / 25.4) * 100) / 100;
    default:
      return Math.round(mm * 10) / 10;
  }
}

/** Converts a value entered in `unit` back to millimetres. */
export function toMm(value: number, unit: DisplayUnit): number {
  switch (unit) {
    case 'px':
      return value / PX_PER_MM;
    case 'inch':
      return value * 25.4;
    default:
      return value;
  }
}

type ViewStore = {
  /** 1 = 100%. */
  readonly zoom: number;
  readonly unit: DisplayUnit;
  readonly showRulers: boolean;
  /** Spacing of the snap grid, in millimetres. */
  readonly gridStepMm: number;
  /** Whether a drag is pulled onto the grid at all. */
  readonly snapToGrid: boolean;
  /** True when the view should refit the artwork on the next layout pass. */
  readonly fitRequested: boolean;
  readonly setZoom: (zoom: number) => void;
  readonly zoomBy: (factor: number) => void;
  readonly setUnit: (unit: DisplayUnit) => void;
  readonly toggleRulers: () => void;
  readonly setGridStep: (stepMm: number) => void;
  readonly toggleGridSnap: () => void;
  readonly requestFit: () => void;
  readonly clearFitRequest: () => void;
};

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * Grid spacings offered in the panel, in millimetres.
 *
 * Round numbers a label is actually laid out on. A step is never zero, because
 * snapping to a grid of nothing would divide by it.
 */
export const GRID_STEPS_MM = [1, 2, 5, 10] as const;

const DEFAULT_GRID_STEP_MM = 5;

/** Falls back to the default when a stored or typed step is unusable. */
function clampGridStep(stepMm: number): number {
  return Number.isFinite(stepMm) && stepMm > 0 ? stepMm : DEFAULT_GRID_STEP_MM;
}

export const useViewStore = create<ViewStore>()(
  persist(
    set => ({
      zoom: 1,
      unit: 'mm',
      showRulers: true,
      gridStepMm: DEFAULT_GRID_STEP_MM,
      // Off by default: element snapping already lines things up with what is
      // on the page, and a grid nobody asked for moves artwork that was placed
      // to a supplier's measurement.
      snapToGrid: false,
      fitRequested: true,

      setZoom: zoom => set({ zoom: clampZoom(zoom), fitRequested: false }),
      zoomBy: factor =>
        set(state => ({
          zoom: clampZoom(state.zoom * factor),
          fitRequested: false,
        })),
      setUnit: unit => set({ unit }),
      toggleRulers: () => set(state => ({ showRulers: !state.showRulers })),
      setGridStep: stepMm => set({ gridStepMm: clampGridStep(stepMm) }),
      toggleGridSnap: () => set(state => ({ snapToGrid: !state.snapToGrid })),
      requestFit: () => set({ fitRequested: true }),
      clearFitRequest: () => set({ fitRequested: false }),
    }),
    {
      name: 'smart-label-view-store',
      // A pending fit request is per-session, not a saved preference.
      partialize: state => ({
        zoom: state.zoom,
        unit: state.unit,
        showRulers: state.showRulers,
        gridStepMm: state.gridStepMm,
        snapToGrid: state.snapToGrid,
      }),
      // A step saved as zero or missing would divide by nothing on the way in.
      merge: (persisted, current) => {
        const saved = persisted as Partial<ViewStore> | undefined;

        return {
          ...current,
          ...saved,
          gridStepMm: clampGridStep(saved?.gridStepMm ?? DEFAULT_GRID_STEP_MM),
        };
      },
    },
  ),
);
