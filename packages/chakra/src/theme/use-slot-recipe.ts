import { useMemo } from 'react';
import * as ChakraStyledSystemRuntime from '@chakra-ui/react/styled-system';

type ChakraDocsSlotRecipeConfig = Record<string, unknown>;

interface ChakraDocsSystem {
  getSlotRecipe: (
    key: string,
    fallback: ChakraDocsSlotRecipeConfig,
  ) => ChakraDocsSlotRecipeConfig;
  sva: (
    config: ChakraDocsSlotRecipeConfig,
  ) => (props?: Record<string, unknown>) => Record<string, unknown>;
}

const { useChakraContext } = ChakraStyledSystemRuntime as unknown as {
  useChakraContext: () => ChakraDocsSystem;
};

export function useChakraDocsSlotRecipe(
  key: string,
  fallback: ChakraDocsSlotRecipeConfig,
) {
  const system = useChakraContext();

  return useMemo(
    () => system.sva(structuredClone(system.getSlotRecipe(key, fallback))),
    [fallback, key, system],
  );
}

export function mergeSlotStyleProps(
  styles: unknown,
  slotProps: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const { css, ...props } = slotProps ?? {};

  return {
    // Chakra components wrap `css` again and only flatten a single level.
    // Flatten composed slots here, while leaving responsive arrays inside
    // style objects untouched.
    css: [styles, css].flat(Infinity),
    ...props,
  };
}

// Portals lose root inheritance. Carry custom properties (including conditional
// declarations) without copying the root's flex layout, borders, or spacing.
export function extractSlotCssVariables(styles: unknown): unknown {
  if (Array.isArray(styles)) {
    return styles.map(extractSlotCssVariables);
  }
  if (!styles || typeof styles !== 'object') return {};

  const variables: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith('--')) {
      variables[key] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = extractSlotCssVariables(value) as Record<string, unknown>;
      if (Object.keys(nested).length > 0) variables[key] = nested;
    }
  }
  return variables;
}
