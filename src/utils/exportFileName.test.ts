import { describe, expect, it } from 'vitest';
import { exportFileName } from './exportFileName';

describe('exportFileName', () => {
  it('names a single-page export without a page number', () => {
    expect(exportFileName('care-label', 'png')).toBe('care-label.png');
  });

  it('numbers a page so two of them cannot collide', () => {
    expect(exportFileName('care-label', 'png', { number: 1 }))
      .toBe('care-label-1.png');
    expect(exportFileName('care-label', 'png', { number: 2 }))
      .toBe('care-label-2.png');
  });

  it('uses the page name when the operator gave it one', () => {
    expect(exportFileName('tag', 'png', { number: 2, name: 'back' }))
      .toBe('tag-2-back.png');
  });

  it('keeps the number when a page name sanitises away to nothing', () => {
    expect(exportFileName('tag', 'png', { number: 2, name: '///' }))
      .toBe('tag-2.png');
  });

  it('strips characters a filesystem would reject', () => {
    expect(exportFileName('my label/2026?', 'pdf')).toBe('my-label-2026.pdf');
  });

  it('falls back when the base has nothing usable left', () => {
    expect(exportFileName('///', 'png')).toBe('label.png');
    expect(exportFileName('', 'pdf')).toBe('label.pdf');
  });
});
