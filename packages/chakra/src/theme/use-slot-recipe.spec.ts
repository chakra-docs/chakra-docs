import { describe, expect, it } from 'vitest';
import {
  extractSlotCssVariables,
  mergeSlotStyleProps,
} from './use-slot-recipe.js';

describe('extractSlotCssVariables', () => {
  it('preserves composed, conditional and responsive variables without root layout', () => {
    expect(
      extractSlotCssVariables([
        {
          '@layer recipes': {
            display: 'flex',
            '--size': '14px',
            _dark: { '--color': 'white', bg: 'black' },
          },
        },
        { '--size': ['12px', '16px'], minH: 11 },
        { '@media (min-width: 48rem)': { '--size': '18px', gap: 4 } },
      ]),
    ).toEqual([
      { '@layer recipes': { '--size': '14px', _dark: { '--color': 'white' } } },
      { '--size': ['12px', '16px'] },
      { '@media (min-width: 48rem)': { '--size': '18px' } },
    ]);
  });

  it('accepts missing styles and discards non-variable properties', () => {
    expect(extractSlotCssVariables(undefined)).toEqual({});
    expect(
      extractSlotCssVariables({
        display: 'flex',
        px: [2, 4],
        _hover: { bg: 'bg' },
      }),
    ).toEqual({});
  });
});

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
