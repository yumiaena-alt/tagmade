'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

const StudioSkeleton = () => {
  const t = useTranslations('Editor');

  return (
    <div
      className="
        grid gap-6
        lg:grid-cols-[320px_minmax(0,1fr)]
      "
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-[520px] animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-[560px] animate-pulse rounded-2xl bg-muted" />
    </div>
  );
};

/**
 * Konva needs a real canvas and the document store rehydrates from local
 * storage, so the studio is client-only while the page around it stays a server
 * component.
 */
const StudioShell = dynamic(
  () => import('./StudioShell').then(module => module.StudioShell),
  { ssr: false, loading: () => <StudioSkeleton /> },
);

export const StudioShellLoader = () => <StudioShell />;
