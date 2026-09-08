import { describe, expect, it, vi } from 'vitest';
import { emitAnalytics } from './analytics.js';

describe('analytics observers', () => {
  it('forwards arguments once and accepts missing callbacks', () => {
    const callback = vi.fn();
    const event = { query: 'docs' };
    emitAnalytics(callback, event, 2);
    expect(callback).toHaveBeenCalledExactlyOnceWith(event, 2);
    expect(() => emitAnalytics(undefined)).not.toThrow();
  });

  it('isolates synchronous throws and asynchronous rejections', async () => {
    expect(() =>
      emitAnalytics(() => {
        throw new Error('offline');
      }),
    ).not.toThrow();
    emitAnalytics(async () => {
      throw new Error('offline');
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
