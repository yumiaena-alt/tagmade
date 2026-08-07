'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import {
  isUserTemplateId,
  useUserTemplateStore,
} from '@/store/useUserTemplateStore';
import { useTemplateNames } from './useTemplateNames';

/**
 * Writes to storage this long after the last change, so a run of keystrokes is
 * one write rather than one per letter.
 */
const QUIET_MS = 800;

/**
 * Keeps the open document mirrored into the operator's own templates.
 *
 * Nothing here renders. It exists because the moment work becomes worth keeping
 * is the first edit, not the moment somebody remembers a save button — so
 * touching a built-in template forks it into a named entry of your own, and
 * every edit after that updates it in place.
 *
 * The document carries the entry's id in `templateId`, which is what survives a
 * reload and tells a later edit which entry to update rather than fork again.
 */
export const AutoTemplateRecorder = () => {
  const t = useTranslations('Studio');
  const templateNames = useTemplateNames();
  const doc = useDocumentStore(state => state.doc);
  const adoptRecord = useDocumentStore(state => state.adoptRecord);
  const recordWorking = useUserTemplateStore(state => state.recordWorking);
  // The document as it was when it was first shown. Recording it immediately
  // would fill the list with untouched copies of every template browsed past.
  const baselineRef = useRef<string | null>(null);

  useEffect(() => {
    const snapshot = JSON.stringify(doc);

    if (baselineRef.current === null) {
      baselineRef.current = snapshot;

      return;
    }

    // A template swap replaces the document wholesale; that is a new starting
    // point, not an edit of the old one.
    if (!isUserTemplateId(doc.templateId) && baselineRef.current !== snapshot) {
      const previous: { templateId?: string } = JSON.parse(baselineRef.current);

      if (previous.templateId !== doc.templateId) {
        baselineRef.current = snapshot;

        return;
      }
    }

    if (baselineRef.current === snapshot) {
      return;
    }

    const timer = setTimeout(() => {
      baselineRef.current = snapshot;

      const fallback = templateNames[doc.templateId] ?? t('untitled_document');
      const result = recordWorking(doc, fallback);

      if (result.ok && (result.id !== doc.templateId || !doc.name)) {
        adoptRecord(result.id, fallback);
      }
    }, QUIET_MS);

    return () => clearTimeout(timer);
  }, [doc, recordWorking, adoptRecord, templateNames, t]);

  return null;
};
