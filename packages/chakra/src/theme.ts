import {
  chakraDocsRecipeKeys as internalRecipeKeys,
  chakraDocsSlotRecipes as internalSlotRecipes,
  chakraDocsThemeConfig as internalThemeConfig,
} from './theme/recipes.js';
import type {
  ChakraDocsRecipeKey,
  ChakraDocsRecipeKeyMap,
  ChakraDocsSlotRecipeConfig,
  ChakraDocsThemeConfig,
} from './theme/theme-contract.js';

export type {
  ChakraDocsRecipeKey,
  ChakraDocsRecipeKeyMap,
  ChakraDocsSlotRecipeConfig,
  ChakraDocsThemeConfig,
  ChakraDocsThemeStyleObject,
} from './theme/theme-contract.js';

export const chakraDocsRecipeKeys: ChakraDocsRecipeKeyMap = internalRecipeKeys;
export const chakraDocsSlotRecipes: Readonly<
  Record<ChakraDocsRecipeKey, ChakraDocsSlotRecipeConfig>
> = internalSlotRecipes;
export const chakraDocsThemeConfig: ChakraDocsThemeConfig = internalThemeConfig;
