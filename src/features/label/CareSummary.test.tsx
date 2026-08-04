import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import messages from '@/locales/ko.json';
import { buildCareGuide } from '@/utils/careRules';
import { parseFabricComposition } from '@/utils/fabricParser';
import { CareSummary } from './CareSummary';

/** Renders the summary straight from raw seller input, like the studio does. */
async function renderFor(input: string) {
  const composition = parseFabricComposition(input);

  await render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <CareSummary
        composition={composition}
        careGuide={buildCareGuide(composition)}
      />
    </NextIntlClientProvider>,
  );
}

describe('CareSummary', () => {
  it('shows the standardized fibers rather than the raw input', async () => {
    await renderFor('코튼80 스판5 나일론15');

    // Exact match: fiber names also appear inside the tier reason sentence.
    await expect.element(page.getByText('면', { exact: true })).toBeVisible();
    await expect.element(page.getByText('폴리우레탄', { exact: true })).toBeVisible();
    await expect.element(page.getByText('나일론', { exact: true })).toBeVisible();

    expect(page.getByText('코튼', { exact: true }).elements()).toHaveLength(0);
    expect(page.getByText('스판', { exact: true }).elements()).toHaveLength(0);
  });

  it('flags a composition that does not add up to 100%', async () => {
    await renderFor('면 70%');

    await expect.element(page.getByText(/100%가 아닙니다/)).toBeVisible();
  });

  it('does not flag a complete composition', async () => {
    await renderFor('면 80% 폴리 20%');

    expect(page.getByText(/100%가 아닙니다/).elements()).toHaveLength(0);
  });

  it('surfaces the dry-clean requirement for a wool blend', async () => {
    await renderFor('울 99% 스판 1%');

    await expect.element(page.getByText('1순위 · 동물성')).toBeVisible();
    await expect.element(page.getByText('드라이클리닝 필수')).toBeVisible();
  });

  it('keeps the spandex caution even though wool governs the symbols', async () => {
    await renderFor('울 99% 스판 1%');

    await expect
      .element(page.getByText('건조기 사용 시 수축·변형 주의'))
      .toBeVisible();
  });

  it('prompts for input when nothing has been entered', async () => {
    await renderFor('');

    await expect
      .element(page.getByText(/법적 표준 소재명으로 자동 변환/))
      .toBeVisible();
  });
});
