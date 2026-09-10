import { describe, expect, it } from 'vitest';
import {
  chakraDocsRecipeKeys,
  chakraDocsSlotRecipes,
  chakraDocsThemeConfig,
} from './theme.js';

describe('Chakra Docs theme entry point', () => {
  it('wraps long content without changing code whitespace or table scrolling', () => {
    const content = {
      cards: ['card', 'content'],
      breadcrumbs: ['item', 'link', 'current'],
      sidebar: ['link', 'sectionTitle'],
      tableOfContents: ['link'],
      mobileTableOfContents: ['link'],
      search: ['resultContent'],
      pagination: ['item', 'link'],
      markdownContent: ['root'],
    } as const;
    for (const [key, slots] of Object.entries(content)) {
      const recipe =
        chakraDocsSlotRecipes[
          chakraDocsRecipeKeys[key as keyof typeof content]
        ];
      for (const slot of slots)
        expect(recipe.base[slot], `${key}.${slot}`).toMatchObject({
          minW: 0,
          overflowWrap: 'anywhere',
        });
    }
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.codeBlock].base.code,
    ).toMatchObject({
      whiteSpace: 'pre',
      overflowWrap: 'normal',
      overflowX: 'auto',
    });
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.markdownContent].base
        .tableContainer.overflowX,
    ).toBe('auto');
  });

  it('respects reduced motion for disclosure indicators and dialog surfaces', () => {
    const animated = {
      sidebar: ['indicator'],
      pageActions: ['menuIndicator', 'submenuIndicator'],
      mobileNavigation: ['content', 'backdrop'],
      search: ['root', 'backdrop'],
    } as const;
    for (const [key, slots] of Object.entries(animated)) {
      const recipe =
        chakraDocsSlotRecipes[
          chakraDocsRecipeKeys[key as keyof typeof animated]
        ];
      for (const slot of slots)
        expect(recipe.base[slot]._motionReduce, `${key}.${slot}`).toEqual({
          animation: 'none',
          transition: 'none',
        });
    }
  });
  it('gives standalone mobile controls 44px hit areas without enlarging inline links', () => {
    const controls = {
      tabs: ['trigger'],
      sidebar: ['link', 'trigger'],
      feedback: ['option', 'submit'],
      search: ['trigger'],
      versionSelect: ['select'],
      codeBlock: ['copyTrigger'],
    } as const;
    for (const [key, slots] of Object.entries(controls)) {
      const recipe =
        chakraDocsSlotRecipes[
          chakraDocsRecipeKeys[key as keyof typeof controls]
        ];
      for (const slot of slots)
        expect(recipe.base[slot].minH.base, `${key}.${slot}`).toBe('44px');
    }
    const mobileNav =
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.mobileNavigation];
    expect(mobileNav.base.trigger.minH).toBe('44px');
    expect(mobileNav.base.closeTrigger).toMatchObject({ h: 11, w: 11 });
    const mobileToc =
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.mobileTableOfContents];
    expect(mobileToc.base.trigger.minH).toBe('44px');
    expect(mobileToc.base.link.minH).toBe('44px');
    for (const key of ['markdownContent', 'breadcrumbs'] as const) {
      expect(
        chakraDocsSlotRecipes[chakraDocsRecipeKeys[key]].base.link?.minH,
      ).toBeUndefined();
    }
  });
  it('provides visible recipe-level keyboard focus for navigation and form controls', () => {
    const controls = {
      cards: ['card'],
      breadcrumbs: ['link'],
      sidebar: ['link', 'trigger'],
      tableOfContents: ['link'],
      mobileTableOfContents: ['trigger', 'link'],
      versionSelect: ['select'],
      pagination: ['link'],
      search: ['trigger', 'input', 'resultLink'],
      feedback: ['option', 'comment', 'submit'],
    } as const;
    for (const [key, slots] of Object.entries(controls)) {
      const recipe =
        chakraDocsSlotRecipes[
          chakraDocsRecipeKeys[key as keyof typeof controls]
        ];
      for (const slot of slots) {
        expect(recipe.base[slot]._focusVisible, `${key}.${slot}`).toMatchObject(
          { outline: '2px solid', outlineColor: 'fg' },
        );
      }
    }
  });
  it('bounds page-action menus while keeping long rows readable and scrollable', () => {
    const recipe = chakraDocsSlotRecipes[chakraDocsRecipeKeys.pageActions];
    for (const slot of ['menuContent', 'submenuContent']) {
      expect(recipe.base[slot]).toMatchObject({
        minW: 'min(18rem, var(--available-width, calc(100dvw - 1rem)))',
        maxW: 'min(var(--available-width, 100dvw), calc(100dvw - 1rem))',
        maxH: 'min(var(--available-height, 100dvh), calc(100dvh - 1rem))',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      });
    }
    expect(recipe.base.menuItem).toMatchObject({
      flexShrink: 0,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
    });
    expect(recipe.base.label.overflowWrap).toBe('anywhere');
    expect(recipe.base.description.overflowWrap).toBe('anywhere');
  });
  it('owns focus appearance for portaled menus and submenus', () => {
    const recipe = chakraDocsSlotRecipes[chakraDocsRecipeKeys.pageActions];
    for (const slot of ['menuContent', 'submenuContent']) {
      expect(recipe.base[slot]._focusVisible).toEqual({
        outline: '1px solid',
        outlineColor: 'fg.muted',
        outlineOffset: '-1px',
      });
    }
    expect(recipe.base.menuItem._highlighted.bg).toBe('bg.panel');
  });
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
