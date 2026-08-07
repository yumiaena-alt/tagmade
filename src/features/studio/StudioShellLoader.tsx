'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

const StudioSkeleton = () => {
  const t = useTranslations('Editor');

  return (
    <div
      className={`
        flex h-[calc(100svh-11rem)] min-h-[560px] flex-col gap-2
        max-lg:h-auto
      `}
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="h-14 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className={`
        flex min-h-0 flex-1 gap-3
        max-lg:flex-col
      `}
      >
        <div className={`
          w-[280px] shrink-0 animate-pulse rounded-xl bg-muted
          max-lg:h-[200px] max-lg:w-full
        `}
        />
        <div className={`
          min-h-0 flex-1 animate-pulse rounded-xl bg-muted
          max-lg:h-[560px]
        `}
        />
      </div>
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
