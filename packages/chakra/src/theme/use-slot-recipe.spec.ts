import { describe, expect, it } from 'vitest';
import { mergeSlotStyleProps } from './use-slot-recipe.js';

describe('mergeSlotStyleProps', () => {
  it('flattens composed styles without changing responsive property arrays', () => {
    const base = { px: [2, 4], bg: 'transparent' };
    const variant = { borderEndRadius: 0 };
    const override = { color: 'fg' };
    expect(
      mergeSlotStyleProps([base, [variant]], {
        css: [[override]],
        'aria-label': 'Action',
      }),
    ).toEqual({
      css: [base, variant, override],
      'aria-label': 'Action',
    });
  });
});
