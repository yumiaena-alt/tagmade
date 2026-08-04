'use client';

import type { CareGuide, CareTier } from '@/utils/careRules';
import type { FabricComposition } from '@/utils/fabricParser';
import { useTranslations } from 'next-intl';
import { CareSymbolIcon } from './CareSymbolIcon';

/** Visual weight per tier: the more delicate the fabric, the louder the badge. */
const TIER_BADGE_CLASS: Record<CareTier, string> = {
  animal: 'bg-destructive/10 text-destructive ring-destructive/20',
  regenerated: 'bg-chart-4/15 text-chart-4 ring-chart-4/25',
  synthetic: 'bg-chart-2/15 text-chart-2 ring-chart-2/25',
  basic: 'bg-chart-3/15 text-chart-3 ring-chart-3/25',
};

const FULL_COMPOSITION = 100;

type CareSummaryProps = {
  composition: FabricComposition;
  careGuide: CareGuide;
};

export const CareSummary = ({ composition, careGuide }: CareSummaryProps) => {
  const t = useTranslations('LabelStudio');
  const entries = Object.entries(composition);
  const total
    = Math.round(entries.reduce((sum, [, percent]) => sum + percent, 0) * 10) / 10;
  const isComplete = total === FULL_COMPOSITION;

  // Literal keys so both the type checker and `check:i18n` see the usage.
  const tierLabels: Record<CareTier, string> = {
    animal: t('tier_animal'),
    regenerated: t('tier_regenerated'),
    synthetic: t('tier_synthetic'),
    basic: t('tier_basic'),
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium">{t('summary_heading')}</h2>
          <span
            className={
              isComplete
                ? 'text-xs font-medium text-muted-foreground tabular-nums'
                : 'text-xs font-medium text-destructive tabular-nums'
            }
          >
            {isComplete
              ? t('summary_total', { total })
              : t('summary_total_incomplete', { total })}
          </span>
        </header>

        {entries.length > 0
          ? (
              <ul className="flex flex-wrap gap-1.5">
                {entries.map(([fiber, percent]) => (
                  <li
                    key={fiber}
                    className={`
                      flex items-baseline gap-1 rounded-md bg-secondary px-2.5
                      py-1 text-sm
                    `}
                  >
                    <span className="font-medium">{fiber}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {percent}
                      %
                    </span>
                  </li>
                ))}
              </ul>
            )
          : (
              <p className="text-sm text-muted-foreground">{t('summary_empty')}</p>
            )}
      </section>

      <section className="space-y-3">
        <header className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium">{t('symbols_heading')}</h2>
          <span
            className={`
              rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset
              ${TIER_BADGE_CLASS[careGuide.tier]}
            `}
          >
            {tierLabels[careGuide.tier]}
          </span>
        </header>

        <p className="text-xs/relaxed text-muted-foreground">{careGuide.reason}</p>

        <ul className="grid grid-cols-5 gap-1.5">
          {careGuide.symbols.map(symbol => (
            <li
              key={symbol.category}
              className={`
                flex flex-col items-center gap-1.5 rounded-lg border
                border-border bg-card px-1 py-2.5
              `}
            >
              <CareSymbolIcon code={symbol.code} size={34} />
              <span className="
                text-center text-[10px] leading-tight text-muted-foreground
              "
              >
                {symbol.label}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">{t('symbols_printed_note')}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">{t('warnings_heading')}</h2>
        <ul className="space-y-1">
          {careGuide.warnings.map(warning => (
            <li
              key={warning}
              className="flex gap-2 text-sm/relaxed text-muted-foreground"
            >
              <span aria-hidden="true" className="text-foreground/40">·</span>
              {warning}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
