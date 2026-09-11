import { describe, expect, it, vi } from 'vitest';
import {
  getDocsTabsSyncValue,
  publishDocsTabsSyncValue,
  subscribeDocsTabsSyncValue,
} from './tabs-sync.js';

describe('docs tabs synchronization', () => {
  it('stores a selection and broadcasts it to mounted groups', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDocsTabsSyncValue('package-manager', listener);

    publishDocsTabsSyncValue('package-manager', 'pnpm');

    expect(getDocsTabsSyncValue('package-manager')).toBe('pnpm');
    expect(listener).toHaveBeenCalledWith('pnpm');

    unsubscribe();
    publishDocsTabsSyncValue('package-manager', 'npm');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps independent synchronization keys isolated', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDocsTabsSyncValue('platform', listener);

    publishDocsTabsSyncValue('language', 'tsx');

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
