'use client';

import type { ReactNode } from 'react';
import type { DocElement, TextAlign, TextCase, TextList } from '@/utils/documentModel';
import type { FontId } from '@/utils/fonts';
import {
  FontBoldIcon,
  FontItalicIcon,
  LetterCaseCapitalizeIcon,
  LetterSpacingIcon,
  ListBulletIcon,
  StrikethroughIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  UnderlineIcon,
} from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useActiveElements, useDocumentStore } from '@/store/useDocumentStore';
import { fontById, FONTS } from '@/utils/fonts';
import { cn } from '@/utils/Helpers';
import { BarGroup, ColorField } from './barControls';

const FIELD_CLASS = `
  rounded-md border border-input bg-background px-1.5 py-1 text-xs
  shadow-xs transition-colors outline-none
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
`;

const ALIGNMENTS: readonly { value: TextAlign; icon: ReactNode }[] = [
  { value: 'left', icon: <TextAlignLeftIcon className="size-4" /> },
  { value: 'center', icon: <TextAlignCenterIcon className="size-4" /> },
  { value: 'right', icon: <TextAlignRightIcon className="size-4" /> },
];

const CASE_ORDER: readonly TextCase[] = ['none', 'upper', 'lower'];
const LIST_ORDER: readonly TextList[] = ['none', 'bullet', 'number'];

type ToggleProps = {
  pressed: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
};

/** One icon button. Every control in this bar carries its name as a tooltip. */
const Toggle = ({ pressed, disabled, label, onClick, children }: ToggleProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={pressed}
    aria-label={label}
    title={label}
    className={cn(
      'rounded-md p-2 transition-colors',
      disabled
        ? 'cursor-not-allowed text-muted-foreground/40'
        : `
          cursor-pointer
          hover:bg-accent
        `,
      pressed && !disabled && 'bg-foreground text-background',
    )}
  >
    {children}
  </button>
);

/**
 * Formatting for the selected text element, as a strip above the canvas.
 *
 * It appears only while a text element is selected, so the bar is not a
 * permanent tax on canvas height — and it sits above the workspace rather than
 * floating over the artwork, where it would cover the thing being formatted.
 *
 * Controls run in reading order: what the letters are (font, size, colour),
 * then how they are drawn (weight, slant, lines through them, case), then how
 * they are arranged (alignment, lists, spacing).
 */
export const TextFormatBar = () => {
  const t = useTranslations('Studio');
  const elements = useActiveElements();
  const selectedIds = useDocumentStore(state => state.selectedIds);
  const updateSelected = useDocumentStore(state => state.updateSelected);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const spacingRef = useRef<HTMLDivElement>(null);

  // The first text element in the selection supplies the values shown. A
  // mixed selection still gets the bar, because the controls write to every
  // text element in it and leave the rest alone.
  const element = elements.find(
    (item): item is Extract<DocElement, { type: 'text' }> =>
      selectedIds.includes(item.id) && item.type === 'text',
  ) ?? null;

  // Close the spacing popover on an outside click, the way a menu should.
  useEffect(() => {
    if (!spacingOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!spacingRef.current?.contains(event.target as Node)) {
        setSpacingOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);

    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [spacingOpen]);

  if (!element) {
    return null;
  }

  const font = fontById(element.fontId);
  const patch = (change: Partial<DocElement>) => updateSelected(change, 'text');

  const caseLabels: Record<TextCase, string> = {
    none: t('text_case_none'),
    upper: t('text_case_upper'),
    lower: t('text_case_lower'),
  };

  const listLabels: Record<TextList, string> = {
    none: t('text_list_none'),
    bullet: t('text_list_bullet'),
    number: t('text_list_number'),
  };

  const alignLabels: Record<TextAlign, string> = {
    left: t('align_left'),
    center: t('align_center'),
    right: t('align_right'),
  };

  const textCase = element.textCase ?? 'none';
  const list = element.list ?? 'none';

  /** Cycles a setting, so one icon covers all of its states. */
  const cycle = <T,>(order: readonly T[], current: T): T =>
    order[(order.indexOf(current) + 1) % order.length]!;

  return (
    <div
      role="toolbar"
      aria-label={t('text_format_label')}
      className={`
        flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2
        rounded-xl border border-border bg-background px-3 py-2
      `}
    >
      <BarGroup>
        <select
          aria-label={t('font_family')}
          title={t('font_family')}
          value={font.id}
          onChange={event => patch({ fontId: event.target.value as FontId })}
          className={cn(FIELD_CLASS, 'w-32 cursor-pointer')}
        >
          {FONTS.map(item => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          aria-label={t('font_size')}
          title={t('font_size')}
          value={element.fontSize}
          min={0.5}
          step={0.2}
          onChange={event =>
            patch({ fontSize: Number(event.target.value) || element.fontSize })}
          className={cn(FIELD_CLASS, 'w-16 tabular-nums')}
        />

        <ColorField
          label={t('font_color')}
          value={element.color ?? '#111111'}
          onChange={color => patch({ color })}
        />
      </BarGroup>

      <BarGroup>

        <Toggle
          pressed={Boolean(element.bold)}
          label={t('bold')}
          onClick={() => patch({ bold: !element.bold })}
        >
          <FontBoldIcon className="size-4" />
        </Toggle>

        <Toggle
          pressed={Boolean(element.italic)}
          // A family with no italic face would export upright however the canvas
          // fakes it, so the control says so instead of lying.
          disabled={!font.hasItalic}
          label={font.hasItalic ? t('italic') : t('italic_unavailable')}
          onClick={() => patch({ italic: !element.italic })}
        >
          <FontItalicIcon className="size-4" />
        </Toggle>

        <Toggle
          pressed={Boolean(element.underline)}
          label={t('underline')}
          onClick={() => patch({ underline: !element.underline })}
        >
          <UnderlineIcon className="size-4" />
        </Toggle>

        <Toggle
          pressed={Boolean(element.strike)}
          label={t('strikethrough')}
          onClick={() => patch({ strike: !element.strike })}
        >
          <StrikethroughIcon className="size-4" />
        </Toggle>

        <Toggle
          pressed={textCase !== 'none'}
          label={`${t('text_case')}: ${caseLabels[textCase]}`}
          onClick={() => patch({ textCase: cycle(CASE_ORDER, textCase) })}
        >
          <LetterCaseCapitalizeIcon className="size-4" />
        </Toggle>

      </BarGroup>

      <BarGroup>
        {ALIGNMENTS.map(item => (
          <Toggle
            key={item.value}
            pressed={(element.align ?? 'left') === item.value}
            label={alignLabels[item.value]}
            onClick={() => patch({ align: item.value })}
          >
            {item.icon}
          </Toggle>
        ))}

        <Toggle
          pressed={list !== 'none'}
          label={`${t('text_list')}: ${listLabels[list]}`}
          onClick={() => patch({ list: cycle(LIST_ORDER, list) })}
        >
          <ListBulletIcon className="size-4" />
        </Toggle>

        <div ref={spacingRef} className="relative">
          <Toggle
            pressed={spacingOpen}
            label={t('text_spacing')}
            onClick={() => setSpacingOpen(open => !open)}
          >
            <LetterSpacingIcon className="size-4" />
          </Toggle>

          {spacingOpen
            ? (
                <div className={`
                  absolute top-full left-0 z-10 mt-1 w-52 space-y-2 rounded-lg
                  border border-border bg-background p-2 shadow-md
                `}
                >
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t('letter_spacing')}
                    </span>
                    <input
                      type="number"
                      value={element.letterSpacing ?? 0}
                      step={0.05}
                      onChange={event =>
                        patch({ letterSpacing: Number(event.target.value) || 0 })}
                      className={cn(FIELD_CLASS, 'w-20 tabular-nums')}
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t('line_height')}
                    </span>
                    <input
                      type="number"
                      value={element.lineHeight ?? 1.35}
                      min={0.8}
                      step={0.05}
                      onChange={event =>
                        patch({
                          lineHeight:
                          Number(event.target.value) || element.lineHeight || 1.35,
                        })}
                      className={cn(FIELD_CLASS, 'w-20 tabular-nums')}
                    />
                  </label>
                </div>
              )
            : null}
        </div>
      </BarGroup>
    </div>
  );
};
