// Runs in the browser project: this is a wrapper around IndexedDB, so there is
// nothing to test without one.
import { beforeEach, describe, expect, it } from 'vitest';
import { idbStorage } from './idbStorage';

const KEY = 'idb-storage-test';

describe('idbStorage', () => {
  beforeEach(async () => {
    await idbStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  });

  it('reads back what it wrote', async () => {
    await idbStorage.setItem(KEY, '{"templates":[]}');

    await expect(idbStorage.getItem(KEY)).resolves.toBe('{"templates":[]}');
  });

  it('answers null for a key it has never seen', async () => {
    await expect(idbStorage.getItem('idb-storage-absent')).resolves.toBeNull();
  });

  it('forgets a key on request', async () => {
    await idbStorage.setItem(KEY, 'kept');
    await idbStorage.removeItem(KEY);

    await expect(idbStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('lifts work an earlier build left in localStorage', async () => {
    localStorage.setItem(KEY, 'saved-before-the-move');

    await expect(idbStorage.getItem(KEY)).resolves.toBe('saved-before-the-move');

    // The copy is now its own, so the same list survives the old pot being
    // cleared — which is the whole point of moving.
    localStorage.removeItem(KEY);

    await expect(idbStorage.getItem(KEY)).resolves.toBe('saved-before-the-move');
  });

  it('leaves the localStorage copy in place for older builds', async () => {
    localStorage.setItem(KEY, 'saved-before-the-move');
    await idbStorage.getItem(KEY);

    expect(localStorage.getItem(KEY)).toBe('saved-before-the-move');
  });
});
