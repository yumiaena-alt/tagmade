import type { LabelDocument } from '@/utils/documentModel';
import { beforeEach, describe, expect, it } from 'vitest';
import { isUserTemplateId, useUserTemplateStore } from './useUserTemplateStore';

const DOC: LabelDocument = {
  templateId: 'hang-tag-wide',
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
          bold: true,
        },
      ],
    },
  ],
};

/** A document big enough to blow the storage ceiling on its own. */
function hugeDocument(): LabelDocument {
  return {
    ...DOC,
    pages: [
      {
        id: 'page-1',
        elements: [
          {
            type: 'image',
            id: 'logo',
            labelKey: 'field_image',
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            src: `data:image/png;base64,${'A'.repeat(2_100_000)}`,
          },
        ],
      },
    ],
  };
}

describe('isUserTemplateId', () => {
  it('tells this store\'s ids from the built-in template ids', () => {
    expect(isUserTemplateId('user-abc-1')).toBe(true);
    expect(isUserTemplateId('hang-tag-wide')).toBe(false);
  });
});

describe('recordWorking', () => {
  beforeEach(() => {
    useUserTemplateStore.setState({ templates: [] });
  });

  it('forks a built-in template into an entry of its own', () => {
    const result = useUserTemplateStore.getState().recordWorking(DOC, '가로형');

    expect(result.ok).toBe(true);
    expect(result.ok && isUserTemplateId(result.id)).toBe(true);

    const [saved] = useUserTemplateStore.getState().templates;

    expect(saved?.name).toBe('가로형');
    expect(saved?.document.widthMm).toBe(90);
  });

  it('stamps the entry id and name onto the stored document', () => {
    const result = useUserTemplateStore.getState().recordWorking(DOC, '가로형');
    const [saved] = useUserTemplateStore.getState().templates;

    expect(result.ok && saved?.document.templateId).toBe(
      result.ok ? result.id : null,
    );
    expect(saved?.document.name).toBe('가로형');
  });

  it('updates the same entry instead of forking again', () => {
    const store = useUserTemplateStore.getState();
    const first = store.recordWorking(DOC, '가로형');
    const id = first.ok ? first.id : '';
    const second = store.recordWorking(
      { ...DOC, templateId: id, widthMm: 60 },
      '가로형',
    );

    expect(second.ok && second.id).toBe(id);

    const { templates } = useUserTemplateStore.getState();

    expect(templates).toHaveLength(1);
    expect(templates[0]?.document.widthMm).toBe(60);
  });

  it('prefers the name carried on the document over the fallback', () => {
    useUserTemplateStore
      .getState()
      .recordWorking({ ...DOC, name: '봄 시즌 행택' }, '가로형');

    expect(useUserTemplateStore.getState().templates[0]?.name)
      .toBe('봄 시즌 행택');
  });

  it('renames the entry when the document name changes', () => {
    const store = useUserTemplateStore.getState();
    const first = store.recordWorking(DOC, '가로형');
    const id = first.ok ? first.id : '';

    store.recordWorking({ ...DOC, templateId: id, name: '새 이름' }, '가로형');

    const { templates } = useUserTemplateStore.getState();

    expect(templates).toHaveLength(1);
    expect(templates[0]?.name).toBe('새 이름');
  });

  it('moves the entry being worked on to the front', () => {
    const store = useUserTemplateStore.getState();
    const first = store.recordWorking(DOC, '첫째');
    const id = first.ok ? first.id : '';

    store.recordWorking({ ...DOC, name: '둘째' }, '둘째');
    store.recordWorking({ ...DOC, templateId: id, name: '첫째' }, '첫째');

    expect(useUserTemplateStore.getState().templates.map(item => item.name))
      .toEqual(['첫째', '둘째']);
  });

  it('trims the name', () => {
    useUserTemplateStore.getState().recordWorking(DOC, '  여백  ');

    expect(useUserTemplateStore.getState().templates[0]?.name).toBe('여백');
  });

  it('refuses a blank name', () => {
    const result = useUserTemplateStore.getState().recordWorking(DOC, '   ');

    expect(result).toEqual({ ok: false, reason: 'empty_name' });
    expect(useUserTemplateStore.getState().templates).toHaveLength(0);
  });

  it('refuses a record that would not fit in storage', () => {
    const result = useUserTemplateStore
      .getState()
      .recordWorking(hugeDocument(), '거대');

    expect(result).toEqual({ ok: false, reason: 'too_large' });
    expect(useUserTemplateStore.getState().templates).toHaveLength(0);
  });

  it('keeps what was already recorded when a later one is too large', () => {
    const store = useUserTemplateStore.getState();

    store.recordWorking(DOC, '작은 것');
    store.recordWorking(hugeDocument(), '거대');

    expect(useUserTemplateStore.getState().templates.map(item => item.name))
      .toEqual(['작은 것']);
  });
});

describe('removeTemplate', () => {
  beforeEach(() => {
    useUserTemplateStore.setState({ templates: [] });
  });

  it('removes a template by id', () => {
    const store = useUserTemplateStore.getState();
    const result = store.recordWorking(DOC, '버릴 것');

    if (result.ok) {
      store.removeTemplate(result.id);
    }

    expect(useUserTemplateStore.getState().templates).toHaveLength(0);
  });
});
