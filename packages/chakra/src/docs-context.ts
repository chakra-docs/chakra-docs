'use client';

import { createContext, createElement, useContext } from 'react';
import type { ElementType, ReactNode } from 'react';
import * as ChakraRuntime from '@chakra-ui/react';
import type {
  ChakraDocsConfig,
  DocsComponentProps,
  DocsLabels,
} from './index.js';

const ChakraCodeBlock = (ChakraRuntime as unknown as Record<string, unknown>)
  .CodeBlock as Record<string, ElementType>;

export const defaultLabels: DocsLabels = {
  search: 'Search',
  clearSearch: 'Clear search',
  searchPlaceholder: 'Search docs',
  searchNoResults: 'No results found',
  searchLoading: 'Searching…',
  searchError: 'Search is temporarily unavailable',
  searchPopular: 'Popular docs',
  searchResults: 'Results',
  allVersions: 'All versions',
  version: 'Version',
  allCollections: 'All docs',
  collection: 'Collection',
  previousPage: 'Previous',
  nextPage: 'Next',
  editPage: 'Edit this page',
  onThisPage: 'On this page',
  navigationTitle: 'Browse',
  navigationMenu: 'Menu',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
  copyCode: 'Copy code',
  copiedCode: 'Copied',
  copyPage: 'Copy page',
  copyPageDescription: 'Copy page as Markdown for LLMs',
  copiedPage: 'Copied!',
  copyLink: 'Copy link',
  copyLinkDescription: 'Copy a link to this page',
  copiedLink: 'Copied!',
  viewMarkdown: 'View as Markdown',
  viewMarkdownDescription: 'Open this page as plain text',
  moreActions: 'More page actions',
  editPageDescription: 'Suggest changes to this page',
  copyHeadingLink: 'Copy section link',
  copiedHeadingLink: 'Copied section link',
  feedbackPrompt: 'Was this page helpful?',
  feedbackHelpful: 'Yes',
  feedbackNotHelpful: 'No',
  feedbackCommentPlaceholder: 'How could this page be improved?',
  feedbackSubmit: 'Send feedback',
  feedbackSubmitting: 'Sending…',
  feedbackSubmitted: 'Thanks for your feedback.',
  feedbackError: 'Feedback could not be sent. Please try again.',
};

const DocsContext = createContext<ChakraDocsConfig>({
  labels: defaultLabels,
});

export function DocsProvider(props: DocsComponentProps): ReactNode {
  const value = mergeConfig(useContext(DocsContext), props.config);
  const children = value.codeBlock?.adapter
    ? createElement(
        ChakraCodeBlock.AdapterProvider,
        { value: value.codeBlock.adapter },
        props.children,
      )
    : props.children;

  return createElement(DocsContext.Provider, { value }, children);
}

export function useDocsConfig(): ChakraDocsConfig {
  const config = useContext(DocsContext);
  return {
    ...config,
    labels: {
      ...defaultLabels,
      ...config.labels,
    },
  };
}

function mergeConfig(
  inherited: ChakraDocsConfig,
  next: ChakraDocsConfig | undefined,
): ChakraDocsConfig {
  return {
    ...inherited,
    ...next,
    codeBlock: {
      ...inherited.codeBlock,
      ...next?.codeBlock,
    },
    icons: {
      ...inherited.icons,
      ...next?.icons,
    },
    layout: {
      ...inherited.layout,
      ...next?.layout,
    },
    pageActions: {
      ...inherited.pageActions,
      ...next?.pageActions,
      icons: {
        ...inherited.pageActions?.icons,
        ...next?.pageActions?.icons,
      },
    },
    labels: {
      ...defaultLabels,
      ...inherited.labels,
      ...next?.labels,
    },
  };
}
