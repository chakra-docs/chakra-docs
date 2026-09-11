import {
  chakraDocsRecipeKeys,
  chakraDocsSlotRecipes,
  chakraDocsThemeConfig,
  type ChakraDocsRecipeKey,
  type ChakraDocsThemeConfig,
} from '@chakra-docs/chakra/theme';

const layoutKey: ChakraDocsRecipeKey = chakraDocsRecipeKeys.layout;
const layoutRecipe = chakraDocsSlotRecipes[layoutKey];

export const sharedTheme: ChakraDocsThemeConfig = {
  theme: {
    slotRecipes: {
      ...chakraDocsThemeConfig.theme.slotRecipes,
      [layoutKey]: {
        ...layoutRecipe,
        base: {
          ...layoutRecipe.base,
          content: {
            color: 'fg',
            borderColor: 'whiteAlpha.200',
            paddingInline: { base: '4', lg: '8' },
          },
        },
      },
    },
  },
};
