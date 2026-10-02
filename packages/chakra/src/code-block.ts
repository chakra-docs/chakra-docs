'use client';

import { createElement } from 'react';
import type { ElementType, ReactNode } from 'react';
import * as ChakraRuntime from '@chakra-ui/react';
import type {
  DocsComponentProps,
  ChakraDocsCodeBlockSize,
  ChakraDocsCodeBlockVariant,
} from './index.js';
import { defaultLabels, useDocsConfig } from './docs-context.js';
import { emitAnalytics } from './analytics.js';
import {
  chakraDocsRecipeKeys,
  chakraDocsCodeBlockSlotRecipe,
} from './theme/recipes.js';
import {
  mergeSlotStyleProps,
  useChakraDocsSlotRecipe,
} from './theme/use-slot-recipe.js';

const Badge = (ChakraRuntime as unknown as Record<string, ElementType>).Badge;
const ChakraCodeBlock = (ChakraRuntime as unknown as Record<string, unknown>)
  .CodeBlock as Record<string, ElementType>;

export interface CodeBlockProps extends DocsComponentProps {
  code?: string;
  /** Marks this block as a package command for successful-copy analytics. */
  packageManager?: string;
  copy?: boolean;
  copyIcon?: ReactNode;
  copiedIcon?: ReactNode;
  highlightLines?: number[] | string;
  language?: string;
  lineNumbers?: boolean;
  maxHeight?: number | string;
  size?: ChakraDocsCodeBlockSize;
  title?: string;
  variant?: ChakraDocsCodeBlockVariant;
  wrap?: boolean;
  codeSlotProps?: Record<string, unknown>;
  codeTextSlotProps?: Record<string, unknown>;
  contentSlotProps?: Record<string, unknown>;
  controlSlotProps?: Record<string, unknown>;
  copyIndicatorSlotProps?: Record<string, unknown>;
  copyTriggerSlotProps?: Record<string, unknown>;
  headerSlotProps?: Record<string, unknown>;
  languageSlotProps?: Record<string, unknown>;
  titleSlotProps?: Record<string, unknown>;
}

export function CodeBlock(props: CodeBlockProps): ReactNode {
  const config = useDocsConfig();
  const code = props.code ?? getCodeText(props.children);
  const codeBlockConfig = config.codeBlock ?? {};
  const copy = props.copy ?? codeBlockConfig.copy ?? true;
  const lineNumbers = props.lineNumbers ?? codeBlockConfig.lineNumbers ?? false;
  const size = props.size ?? codeBlockConfig.size;
  const variant = props.variant ?? codeBlockConfig.variant;
  const wrap = props.wrap ?? codeBlockConfig.wrap ?? false;
  const copyLabel = config.labels?.copyCode ?? defaultLabels.copyCode;
  const copiedLabel = config.labels?.copiedCode ?? defaultLabels.copiedCode;
  const hasHeader = Boolean(props.title || props.language || (code && copy));
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.codeBlock,
    chakraDocsCodeBlockSlotRecipe,
  );
  const styles = recipe({ variant });

  return createElement(
    ChakraCodeBlock.Root,
    {
      code,
      language: props.language,
      meta: {
        highlightLines: parseHighlightedLines(props.highlightLines),
        showLineNumbers: lineNumbers,
        wordWrap: wrap,
      },
      size,
      ...mergeSlotStyleProps(styles.root, props.slotProps),
      onCopy:
        code && copy
          ? () => {
              emitAnalytics(config.analytics?.onCodeCopy, {
                code,
                language: props.language,
                title: props.title,
              });
              if (props.packageManager) {
                emitAnalytics(config.analytics?.onPackageCommandCopy, {
                  command: code,
                  manager: props.packageManager,
                });
              }
              (props.slotProps?.onCopy as (() => void) | undefined)?.();
            }
          : undefined,
    },
    hasHeader
      ? createElement(
          ChakraCodeBlock.Header,
          mergeSlotStyleProps(styles.header, props.headerSlotProps),
          props.title || props.language
            ? createElement(
                ChakraCodeBlock.Title,
                mergeSlotStyleProps(styles.title, props.titleSlotProps),
                props.title ?? props.language,
              )
            : null,
          createElement(
            ChakraCodeBlock.Control,
            mergeSlotStyleProps(styles.control, props.controlSlotProps),
            props.title && props.language
              ? createElement(
                  Badge,
                  mergeSlotStyleProps(styles.language, props.languageSlotProps),
                  props.language,
                )
              : null,
            code && copy
              ? createElement(
                  ChakraCodeBlock.CopyTrigger,
                  {
                    type: 'button',
                    'aria-label': copyLabel,
                    ...mergeSlotStyleProps(
                      styles.copyTrigger,
                      props.copyTriggerSlotProps,
                    ),
                  },
                  createElement(
                    ChakraCodeBlock.CopyIndicator,
                    {
                      copied:
                        props.copiedIcon ??
                        codeBlockConfig.copiedIcon ??
                        copiedLabel,
                      ...mergeSlotStyleProps(
                        styles.copyIndicator,
                        props.copyIndicatorSlotProps,
                      ),
                    },
                    props.copyIcon ?? codeBlockConfig.copyIcon ?? copyLabel,
                  ),
                )
              : null,
          ),
        )
      : null,
    createElement(
      ChakraCodeBlock.Content,
      mergeSlotStyleProps(
        [
          styles.content,
          props.maxHeight === undefined
            ? undefined
            : { maxHeight: props.maxHeight, overflowY: 'auto' },
        ],
        props.contentSlotProps,
      ),
      createElement(
        ChakraCodeBlock.Code,
        mergeSlotStyleProps(styles.code, props.codeSlotProps),
        createElement(
          ChakraCodeBlock.CodeText,
          mergeSlotStyleProps(styles.codeText, props.codeTextSlotProps),
        ),
      ),
    ),
  );
}

function parseHighlightedLines(value: number[] | string | undefined): number[] {
  if (Array.isArray(value)) {
    return [
      ...new Set(value.filter((line) => Number.isInteger(line) && line > 0)),
    ];
  }

  const lines = new Set<number>();

  for (const part of value?.split(',') ?? []) {
    const [startValue, endValue] = part.trim().split('-');
    const start = Number(startValue);
    const end = Number(endValue ?? startValue);

    if (!Number.isInteger(start) || !Number.isInteger(end)) continue;

    for (
      let line = Math.max(1, start);
      line <= Math.min(end, start + 500);
      line += 1
    ) {
      lines.add(line);
    }
  }

  return [...lines];
}

function getCodeText(children: ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }

  if (typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map((child) => getCodeText(child)).join('');
  }

  return '';
}
