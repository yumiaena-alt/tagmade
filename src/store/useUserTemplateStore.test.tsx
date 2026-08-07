import type { LabelDocument } from '@/utils/documentModel';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUserTemplateStore } from './useUserTemplateStore';

const DOC: LabelDocument = {
  templateId: 'hang-tag-wide',
  widthMm: 90,
  heightMm: 50,
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
};

/** A document big enough to blow the storage ceiling on its own. */
function hugeDocument(): LabelDocument {
  return {
    ...DOC,
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
  };
}

describe('useUserTemplateStore', () => {
  beforeEach(() => {
    useUserTemplateStore.setState({ templates: [] });
  });

  it('saves the open document under a name', () => {
    const result = useUserTemplateStore.getState().saveTemplate('행택 A', DOC);

    expect(result.ok).toBe(true);

    const [saved] = useUserTemplateStore.getState().templates;

    expect(saved?.name).toBe('행택 A');
    expect(saved?.document.widthMm).toBe(90);
    expect(saved?.document.elements).toHaveLength(1);
  });

  it('stamps the saved document with its own template id', () => {
    const result = useUserTemplateStore.getState().saveTemplate('행택 A', DOC);
    const [saved] = useUserTemplateStore.getState().templates;

    expect(result.ok && saved?.document.templateId).toBe(
      result.ok ? result.id : null,
    );
  });

  it('trims the name', () => {
    useUserTemplateStore.getState().saveTemplate('  여백  ', DOC);

    expect(useUserTemplateStore.getState().templates[0]?.name).toBe('여백');
  });

  it('refuses a blank name', () => {
    const result = useUserTemplateStore.getState().saveTemplate('   ', DOC);

    expect(result).toEqual({ ok: false, reason: 'empty_name' });
    expect(useUserTemplateStore.getState().templates).toHaveLength(0);
  });

  it('replaces a template saved under the same name', () => {
    const store = useUserTemplateStore.getState();

    store.saveTemplate('행택', DOC);
    store.saveTemplate('행택', { ...DOC, widthMm: 60 });

    const { templates } = useUserTemplateStore.getState();

    expect(templates).toHaveLength(1);
    expect(templates[0]?.document.widthMm).toBe(60);
  });

  it('keeps the newest save first', () => {
    const store = useUserTemplateStore.getState();

    store.saveTemplate('첫째', DOC);
    store.saveTemplate('둘째', DOC);

    expect(useUserTemplateStore.getState().templates.map(item => item.name))
      .toEqual(['둘째', '첫째']);
  });

  it('refuses a save that would not fit in storage', () => {
    const result = useUserTemplateStore
      .getState()
      .saveTemplate('거대', hugeDocument());

    expect(result).toEqual({ ok: false, reason: 'too_large' });
    expect(useUserTemplateStore.getState().templates).toHaveLength(0);
  });

  it('keeps what was already saved when a later save is too large', () => {
    const store = useUserTemplateStore.getState();

    store.saveTemplate('작은 것', DOC);
    store.saveTemplate('거대', hugeDocument());

    expect(useUserTemplateStore.getState().templates.map(item => item.name))
      .toEqual(['작은 것']);
  });

  it('removes a template by id', () => {
    const store = useUserTemplateStore.getState();
    const result = store.saveTemplate('버릴 것', DOC);

    if (result.ok) {
      store.removeTemplate(result.id);
    }

    expect(useUserTemplateStore.getState().templates).toHaveLength(0);
  });
});
