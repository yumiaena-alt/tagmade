'use client';

import { ResetIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { cn } from '@/utils/Helpers';

/** True when the event targets a field the browser's own undo should handle. */
function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;

  return Boolean(
    element
    && (element.tagName === 'INPUT'
      || element.tagName === 'TEXTAREA'
      || element.isContentEditable),
  );
}

/**
 * Undo and redo, as buttons and as keyboard shortcuts.
 *
 * Shortcuts are ignored while a text field has focus so the browser's native
 * undo keeps working inside inputs — otherwise one keystroke would both revert
 * the field and roll back the document.
 */
export const HistoryControls = () => {
  const t = useTranslations('Studio');
  const undo = useDocumentStore(state => state.undo);
  const redo = useDocumentStore(state => state.redo);
  const canUndo = useDocumentStore(state => state.past.length > 0);
  const canRedo = useDocumentStore(state => state.future.length > 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isAccel = event.ctrlKey || event.metaKey;

      if (!isAccel || event.key.toLowerCase() !== 'z' || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const buttonClass = (enabled: boolean) =>
    cn(
      'p-1.5 transition-colors',
      enabled
        ? `
          cursor-pointer
          hover:bg-accent
        `
        : 'cursor-not-allowed text-muted-foreground/40',
    );

  return (
    <div
      className={`
        absolute top-3 right-3 flex overflow-hidden rounded-lg border
        border-border bg-background shadow-md
      `}
    >
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        aria-label={t('undo')}
        title={`${t('undo')} (Ctrl+Z)`}
        className={buttonClass(canUndo)}
      >
        <ResetIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        aria-label={t('redo')}
        title={`${t('redo')} (Ctrl+Shift+Z)`}
        className={cn(buttonClass(canRedo), 'border-l border-border')}
      >
        <ResetIcon className="size-4 -scale-x-100" />
      </button>
    </div>
  );
};
