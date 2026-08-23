// Runs in the browser project: the store persists to a real localStorage, and
// downloading goes through a real anchor element.
import type { UserTemplate } from '@/store/useUserTemplateStore';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import messages from '@/locales/ko.json';
import { useDocumentStore } from '@/store/useDocumentStore';
import { useUserTemplateStore } from '@/store/useUserTemplateStore';
import { MyTemplates } from './MyTemplates';

const SAVED: UserTemplate = {
  id: 'user-abc-1',
  name: '2026 SS 행택',
  savedAt: '2026-08-23T04:05:00.000Z',
  document: {
    templateId: 'user-abc-1',
    name: '2026 SS 행택',
    widthMm: 90,
    heightMm: 50,
    pages: [
      {
        id: 'page-1',
        elements: [
          {
            type: 'text',
            id: 'brand',
            labelKey: 'field_brand',
            x: 12,
            y: 8,
            width: 44,
            fontSize: 6,
            text: 'BVRI',
          },
        ],
      },
    ],
  },
};

/** What the browser was asked to save, in place of actually saving it. */
function captureDownloads(): readonly { name: string }[] {
  const captured: { name: string }[] = [];

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function (this: HTMLAnchorElement) {
      captured.push({ name: this.download });
    },
  );

  return captured;
}

async function renderList() {
  await render(
    <NextIntlClientProvider locale="ko" messages={messages} timeZone="UTC">
      <MyTemplates />
    </NextIntlClientProvider>,
  );
}

describe('MyTemplates', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    // Storage is read asynchronously; settle it before writing the fixture in,
    // or the read lands on top of it mid-test.
    await useUserTemplateStore.persist.rehydrate();
    useUserTemplateStore.setState({
      templates: [SAVED],
      isReady: true,
      lastFailure: null,
    });
    useDocumentStore.getState().applyTemplate('care-label-standard');
  });

  it('downloads a saved document without opening it', async () => {
    const downloads = captureDownloads();
    const openedBefore = useDocumentStore.getState().doc.templateId;

    await renderList();
    await page.getByRole('button', { name: '2026 SS 행택 내려받기' }).click();

    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.name).toBe('2026-SS-행택.json');
    // The point of downloading from the list: the canvas is left alone, so
    // fetching an old label cannot become an accidental edit of it.
    expect(useDocumentStore.getState().doc.templateId).toBe(openedBefore);
  });

  it('shows when the entry was last recorded', async () => {
    await renderList();

    await expect.element(page.getByText(/저장됨/)).toBeVisible();
  });

  it('still opens the document when the card itself is clicked', async () => {
    await renderList();
    await page.getByRole('button', { name: /2026 SS 행택/ }).first().click();

    expect(useDocumentStore.getState().doc.templateId).toBe('user-abc-1');
  });

  it('says nothing about an empty list until storage has answered', async () => {
    useUserTemplateStore.setState({ templates: [], isReady: false });

    await renderList();

    expect(page.getByText('아직 없습니다.', { exact: false }).elements())
      .toHaveLength(0);

    useUserTemplateStore.setState({ isReady: true });

    await expect.element(page.getByText('아직 없습니다.', { exact: false }))
      .toBeVisible();
  });
});
