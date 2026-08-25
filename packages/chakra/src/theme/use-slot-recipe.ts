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
  ) => (
    props?: Record<string, unknown>,
  ) => Record<string, unknown>;
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
    () =>
      system.sva(structuredClone(system.getSlotRecipe(key, fallback))),
    [fallback, key, system],
  );
}

export function mergeSlotStyleProps(
  styles: unknown,
  slotProps: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const { css, ...props } = slotProps ?? {};

  return {
    css: [styles, css],
    ...props,
  };
}
