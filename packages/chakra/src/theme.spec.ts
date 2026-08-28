import { describe, expect, it } from 'vitest';
import {
  chakraDocsRecipeKeys,
  chakraDocsSlotRecipes,
  chakraDocsThemeConfig,
} from './theme.js';

describe('Chakra Docs theme entry point', () => {
  it('exposes the complete portable theme configuration', () => {
    expect(Object.keys(chakraDocsSlotRecipes)).toEqual(
      Object.values(chakraDocsRecipeKeys),
    );
    expect(chakraDocsThemeConfig).toMatchObject({
      theme: { slotRecipes: chakraDocsSlotRecipes },
    });
  });
});
