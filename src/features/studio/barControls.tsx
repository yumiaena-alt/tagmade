'use client';

import type { ReactNode } from 'react';

/**
 * The shared vocabulary of the two bars above the canvas.
 *
 * Page properties and text formatting are different toolbars, but they sit one
 * above the other and are read as one surface — so a caption, an input and a
 * grouping rule that differ between them read as noise. One definition each,
 * used by both.
 */

export const CONTROL_CLASS = `
  w-16 rounded-md border border-input bg-background px-2 py-1 text-xs
  tabular-nums shadow-xs transition-colors outline-none
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
`;

/** A caption. Small, but not so faint that it stops being readable. */
export const BarLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
    {children}
  </span>
);

/**
 * Related controls, boxed together.
 *
 * A visible surface rather than a bare gap: on a bar this wide, spacing alone
 * did not tell the operator which fields belonged with which.
 */
export const BarGroup = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
    {children}
  </div>
);

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

/** A colour swatch with its name, sized to sit on a bar. */
export const ColorField = ({ label, value, onChange }: ColorFieldProps) => (
  <label
    title={label}
    className={`
      flex cursor-pointer items-center gap-1.5 rounded-md border border-input
      bg-background px-1.5 py-1 transition-colors
      hover:bg-accent
    `}
  >
    <BarLabel>{label}</BarLabel>
    <input
      type="color"
      value={value}
      onChange={event => onChange(event.target.value)}
      className="size-5 cursor-pointer rounded-sm border-0 bg-transparent p-0"
    />
  </label>
);
