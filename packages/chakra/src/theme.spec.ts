import { describe, expect, it } from 'vitest';
import {
  chakraDocsRecipeKeys,
  chakraDocsSlotRecipes,
  chakraDocsThemeConfig,
} from './theme.js';

describe('Chakra Docs theme entry point', () => {
  it('stacks page-action text independently of the icon row', () => {
    const recipe = chakraDocsSlotRecipes[chakraDocsRecipeKeys.pageActions];
    expect(recipe.slots).toContain('actionContent');
    expect(recipe.base.actionContent).toMatchObject({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      minW: 0,
    });
    expect(recipe.base.menuItem.display).toBe('flex');
    expect(recipe.base.menuItem.flexDirection).not.toBe('column');
  });

  it('exposes the complete portable theme configuration', () => {
    expect(Object.keys(chakraDocsSlotRecipes)).toEqual(
      Object.values(chakraDocsRecipeKeys),
    );
    expect(chakraDocsThemeConfig).toMatchObject({
      theme: { slotRecipes: chakraDocsSlotRecipes },
    });
  });
});
