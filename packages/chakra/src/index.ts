'use client';

import {
  Fragment,
  createContext,
  createElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ComponentType, ElementType, ReactNode } from 'react';
import * as ChakraRuntime from '@chakra-ui/react';
import {
  createCollectionOptions,
  createHeadingIdGenerator,
  isSafeDocsRoute,
  isSafeLinkHref,
  stripMarkdown,
} from '@chakra-docs/core';
import type {
  DocsCollection,
  DocsCollectionOption,
  DocsConfig,
  DocsHeading,
  DocsNavItem,
  DocsPage,
  DocsSearchRecord,
} from '@chakra-docs/core';
import { createDocsSearchEngine } from '@chakra-docs/search';
import type {
  DocsSearchProvider,
  DocsSearchQuery,
  DocsSearchResult,
} from '@chakra-docs/search';
import { activateSearchResult } from './search-activation.js';
import { getDefaultSearchResults } from './default-search-results.js';
import type { DocsAnchorClickEvent } from './search-activation.js';
import { createDocsBreadcrumbItems } from './breadcrumbs.js';
import type { DocsBreadcrumbItem } from './breadcrumbs.js';
import {
  getActiveHeadingId,
  getHeadingScrollOffset,
} from './heading-scroll.js';
import type {
  ChakraDocsStickyTop,
  DocsBrowserEnv,
  DocsBrowserWindow,
  DocsScrollBehavior,
} from './heading-scroll.js';
import {
  createRemoteSearchRequester,
  getRemoteSearchDelayMs,
} from './remote-search.js';
import type { RemoteSearchState } from './remote-search.js';
import {
  getActiveSidebarBranchIds,
  getSidebarBranchIds,
  mergeActiveSidebarBranchIds,
  normalizeSidebarExpandedIds,
  resolveSidebarDefaultExpandedIds,
  sidebarExpandedIdsEqual,
  toggleSidebarExpandedId,
} from './sidebar-expansion.js';
import type { DocsSidebarDefaultExpanded } from './sidebar-expansion.js';
import {
  getDocsTabsSyncValue,
  publishDocsTabsSyncValue,
  subscribeDocsTabsSyncValue,
} from './tabs-sync.js';
import {
  chakraDocsApiTableSlotRecipe,
  chakraDocsArticleSlotRecipe,
  chakraDocsBadgeSlotRecipe,
  chakraDocsBreadcrumbsSlotRecipe,
  chakraDocsCalloutSlotRecipe,
  chakraDocsCardsSlotRecipe,
  chakraDocsCodeBlockSlotRecipe,
  chakraDocsFeedbackSlotRecipe,
  chakraDocsLayoutSlotRecipe,
  chakraDocsHeadingPermalinkSlotRecipe,
  chakraDocsMarkdownContentSlotRecipe,
  chakraDocsMobileNavigationSlotRecipe,
  chakraDocsMobileTableOfContentsSlotRecipe,
  chakraDocsPageActionsSlotRecipe,
  chakraDocsPaginationSlotRecipe,
  chakraDocsRecipeKeys,
  chakraDocsSearchSlotRecipe,
  chakraDocsSidebarSlotRecipe,
  chakraDocsStepsSlotRecipe,
  chakraDocsTabsSlotRecipe,
  chakraDocsTableOfContentsSlotRecipe,
  chakraDocsVersionSelectSlotRecipe,
} from './theme/recipes.js';
import {
  mergeSlotStyleProps,
  useChakraDocsSlotRecipe,
} from './theme/use-slot-recipe.js';

export type { ChakraDocsStickyTop } from './heading-scroll.js';
export type { DocsSidebarDefaultExpanded } from './sidebar-expansion.js';
export type { DocsBreadcrumbItem } from './breadcrumbs.js';
export type {
  ChakraDocsRecipeKey,
  ChakraDocsRecipeKeyMap,
  ChakraDocsSlotRecipeConfig,
  ChakraDocsThemeConfig,
  ChakraDocsThemeStyleObject,
} from './theme/theme-contract.js';
export { createDocsBreadcrumbItems } from './breadcrumbs.js';
export {
  chakraDocsApiTableSlotRecipe,
  chakraDocsArticleSlotRecipe,
  chakraDocsBadgeSlotRecipe,
  chakraDocsBreadcrumbsSlotRecipe,
  chakraDocsCalloutSlotRecipe,
  chakraDocsCardsSlotRecipe,
  chakraDocsCodeBlockSlotRecipe,
  chakraDocsFeedbackSlotRecipe,
  chakraDocsLayoutSlotRecipe,
  chakraDocsHeadingPermalinkSlotRecipe,
  chakraDocsMarkdownContentSlotRecipe,
  chakraDocsMobileNavigationSlotRecipe,
  chakraDocsMobileTableOfContentsSlotRecipe,
  chakraDocsPageActionsSlotRecipe,
  chakraDocsPaginationSlotRecipe,
  chakraDocsRecipeKeys,
  chakraDocsSearchSlotRecipe,
  chakraDocsSidebarSlotRecipe,
  chakraDocsSlotRecipes,
  chakraDocsStepsSlotRecipe,
  chakraDocsTabsSlotRecipe,
  chakraDocsTableOfContentsSlotRecipe,
  chakraDocsThemeConfig,
  chakraDocsVersionSelectSlotRecipe,
} from './theme/recipes.js';

const Chakra = ChakraRuntime as unknown as Record<string, ElementType>;
const Badge = Chakra.Badge;
const Box = Chakra.Box;
const Button = Chakra.Button;
const ChakraClipboard = Chakra.Clipboard as unknown as Record<
  string,
  ElementType
>;
const Code = Chakra.Code;
const Container = Chakra.Container;
const Dialog = Chakra.Dialog as unknown as Record<string, ElementType>;
const Tabs = Chakra.Tabs as unknown as Record<string, ElementType>;
const Heading = Chakra.Heading;
const HStack = Chakra.HStack;
const Input = Chakra.Input;
const Kbd = Chakra.Kbd;
const Link = Chakra.Link;
const ChakraMenu = Chakra.Menu as unknown as Record<string, ElementType>;
const Portal = Chakra.Portal;
const Stack = Chakra.Stack;
const Text = Chakra.Text;
const Textarea = Chakra.Textarea;
const ChakraCodeBlock = Chakra.CodeBlock as unknown as Record<
  string,
  ElementType
>;
const emptySearchRecords: readonly DocsSearchRecord[] = [];

export interface DocsLinkProps {
  href: string;
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

export type DocsLinkComponent = ComponentType<DocsLinkProps>;

export interface DocsLabels {
  search: string;
  searchPlaceholder: string;
  searchNoResults: string;
  searchLoading: string;
  searchError: string;
  searchPopular?: string;
  searchResults?: string;
  allVersions?: string;
  version?: string;
  allCollections?: string;
  collection?: string;
  previousPage: string;
  nextPage: string;
  editPage: string;
  onThisPage: string;
  navigationTitle: string;
  navigationMenu: string;
  openNavigation: string;
  closeNavigation: string;
  copyCode: string;
  copiedCode: string;
  copyPage: string;
  copyPageDescription?: string;
  copiedPage: string;
  copyLink: string;
  copyLinkDescription?: string;
  copiedLink: string;
  viewMarkdown: string;
  viewMarkdownDescription?: string;
  moreActions: string;
  editPageDescription?: string;
  copyHeadingLink: string;
  copiedHeadingLink: string;
  feedbackPrompt: string;
  feedbackHelpful: string;
  feedbackNotHelpful: string;
  feedbackCommentPlaceholder: string;
  feedbackSubmit: string;
  feedbackSubmitting: string;
  feedbackSubmitted: string;
  feedbackError: string;
}

export interface DocsAnalyticsCallbacks {
  onSearchOpen?: () => void;
  onSearch?: (query: string) => void;
  onSearchResultSelect?: (result: DocsSearchResult) => void;
  onCodeCopy?: (event: {
    code: string;
    language?: string;
    title?: string;
  }) => void;
  onPackageCommandCopy?: (event: { command: string; manager: string }) => void;
  onPageCopy?: (event: {
    page?: DocsPage;
    value: string;
    format: 'markdown' | 'link';
  }) => void;
  onPageAction?: (event: {
    page?: DocsPage;
    action: string;
    href?: string;
  }) => void;
  onHeadingLinkCopy?: (event: {
    headingId: string;
    href: string;
    title?: string;
  }) => void;
  onPageFeedback?: (event: {
    page?: DocsPage;
    value: DocsPageFeedbackValue;
    comment: string;
  }) => void;
}

export interface ChakraDocsCodeBlockHighlightResult {
  code: string;
  highlighted: boolean;
}

export type ChakraDocsCodeBlockColorScheme = 'light' | 'dark' | (string & {});

export interface ChakraDocsCodeBlockHighlightMeta {
  highlightLines?: number[];
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  removedLineNumbers?: number[];
  addedLineNumbers?: number[];
  focusedLineNumbers?: number[];
  colorScheme?: ChakraDocsCodeBlockColorScheme;
}

export interface ChakraDocsCodeBlockHighlighterProps {
  code: string;
  language?: string;
  meta?: ChakraDocsCodeBlockHighlightMeta;
}

export type ChakraDocsCodeBlockHighlighter = (
  props: ChakraDocsCodeBlockHighlighterProps,
) => ChakraDocsCodeBlockHighlightResult;

export interface ChakraDocsCodeBlockAdapter {
  loadContext?: () => Promise<unknown>;
  loadContextSync?: () => unknown;
  getHighlighter: (context: unknown) => ChakraDocsCodeBlockHighlighter;
  unloadContext?: (context: unknown) => void;
}

export type ChakraDocsCodeBlockSize = 'sm' | 'md' | 'lg';
export type ChakraDocsCodeBlockVariant = 'outline' | 'subtle' | 'plain';

export interface ChakraDocsCodeBlockConfig {
  adapter?: ChakraDocsCodeBlockAdapter;
  copy?: boolean;
  lineNumbers?: boolean;
  size?: ChakraDocsCodeBlockSize;
  variant?: ChakraDocsCodeBlockVariant;
  wrap?: boolean;
}

export interface ChakraDocsLayoutConfig {
  stickyTop?: ChakraDocsStickyTop;
  sidebarStickyTop?: ChakraDocsStickyTop;
  tocStickyTop?: ChakraDocsStickyTop;
  scrollMarginTop?: ChakraDocsStickyTop;
}

export interface ChakraDocsConfig extends DocsConfig {
  linkComponent?: DocsLinkComponent;
  labels?: Partial<DocsLabels>;
  analytics?: DocsAnalyticsCallbacks;
  codeBlock?: ChakraDocsCodeBlockConfig;
  layout?: ChakraDocsLayoutConfig;
}

export interface DocsComponentProps {
  children?: ReactNode;
  config?: ChakraDocsConfig;
  page?: DocsPage;
  nav?: DocsNavItem[];
  headings?: DocsHeading[];
  slotProps?: Record<string, unknown>;
}

export interface DocsLayoutProps extends DocsComponentProps {
  stickyTop?: ChakraDocsStickyTop;
  scrollMarginTop?: ChakraDocsStickyTop;
  contentSlotProps?: Record<string, unknown>;
  innerSlotProps?: Record<string, unknown>;
  mobileNavigation?: boolean;
  mobileNavigationProps?: Omit<DocsMobileNavigationRootProps, 'nav' | 'page'>;
  mobileToc?: boolean;
  mobileTocActiveIndicatorSlotProps?: Record<string, unknown>;
  mobileTocContentSlotProps?: Record<string, unknown>;
  mobileTocCurrentSlotProps?: Record<string, unknown>;
  mobileTocIndicatorSlotProps?: Record<string, unknown>;
  mobileTocItemSlotProps?: Record<string, unknown>;
  mobileTocLinkSlotProps?: Record<string, unknown>;
  mobileTocListSlotProps?: Record<string, unknown>;
  mobileTocSlotProps?: Record<string, unknown>;
  mobileTocTriggerLabelSlotProps?: Record<string, unknown>;
  mobileTocTriggerSlotProps?: Record<string, unknown>;
  sidebarBadgeSlotProps?: Record<string, unknown>;
  sidebarCollapsible?: boolean;
  sidebarContentSlotProps?: Record<string, unknown>;
  sidebarContent?: ReactNode;
  sidebarDefaultExpanded?: DocsSidebarDefaultExpanded;
  sidebarExpandedIds?: readonly string[];
  sidebarIndicatorSlotProps?: Record<string, unknown>;
  onSidebarExpandedChange?: (expandedIds: readonly string[]) => void;
  sidebarSlotProps?: Record<string, unknown>;
  sidebarTriggerSlotProps?: Record<string, unknown>;
  tocSlotProps?: Record<string, unknown>;
}

export interface DocsArticleProps extends DocsComponentProps {
  actions?: ReactNode;
  actionsSlotProps?: Record<string, unknown>;
  breadcrumbs?: ReactNode;
  breadcrumbsSlotProps?: Record<string, unknown>;
  descriptionSlotProps?: Record<string, unknown>;
  headingSlotProps?: Record<string, unknown>;
  headerSlotProps?: Record<string, unknown>;
  titleSlotProps?: Record<string, unknown>;
}

export interface DocsPageActionsRootProps {
  children?: ReactNode;
  editUrl?: string;
  markdown?: string;
  markdownUrl?: string;
  page?: DocsPage;
  pageUrl?: string;
  size?: DocsPageActionsSize;
  slotProps?: Record<string, unknown>;
  variant?: 'default' | 'split';
}

export type DocsPageActionsSize = 'sm' | 'md' | 'lg';

export interface DocsPageActionProps {
  children?: ReactNode;
  copiedLabel?: string;
  description?: ReactNode;
  descriptionSlotProps?: Record<string, unknown>;
  icon?: ReactNode;
  iconSlotProps?: Record<string, unknown>;
  indicatorSlotProps?: Record<string, unknown>;
  label?: string;
  labelSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
}

export interface DocsPageActionLinkProps extends DocsPageActionProps {
  href?: string;
}

export interface DocsPageActionsMenuProps {
  ariaLabel?: string;
  children?: ReactNode;
  closeOnSelect?: boolean;
  contentSlotProps?: Record<string, unknown>;
  defaultOpen?: boolean;
  icon?: ReactNode;
  iconSlotProps?: Record<string, unknown>;
  indicator?: ReactNode;
  indicatorSlotProps?: Record<string, unknown>;
  label?: ReactNode;
  labelSlotProps?: Record<string, unknown>;
  onOpenChange?: (details: DocsPageActionsOpenChangeDetails) => void;
  open?: boolean;
  positioning?: DocsPageActionsPositioning;
  positionerSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
  triggerSlotProps?: Record<string, unknown>;
}

export interface DocsPageActionsOpenChangeDetails {
  open: boolean;
}

export type DocsPageActionsPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end';

export interface DocsPageActionsPositioning {
  fitViewport?: boolean;
  flip?: boolean | DocsPageActionsPlacement[];
  gutter?: number;
  hideWhenDetached?: boolean;
  overflowPadding?: number;
  overlap?: boolean;
  placement?: DocsPageActionsPlacement;
  sameWidth?: boolean;
  shift?: number;
  slide?: boolean;
  strategy?: 'absolute' | 'fixed';
}

export interface DocsPageActionsSubmenuProps extends Omit<
  DocsPageActionsMenuProps,
  'label'
> {
  label: ReactNode;
}

export interface DocsPageActionsGroupProps {
  ariaLabel?: string;
  children?: ReactNode;
  label?: ReactNode;
  labelSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
}

export interface DocsPageActionsSeparatorProps {
  slotProps?: Record<string, unknown>;
}

export interface DocsPageActionsItemProps extends DocsPageActionProps {
  action?: string;
  href?: string;
  onSelect?: () => void;
}

export interface DocsStickyComponentProps extends DocsComponentProps {
  stickyTop?: ChakraDocsStickyTop;
}

export interface DocsSidebarProps extends DocsStickyComponentProps {
  badgeSlotProps?: Record<string, unknown>;
  collapsible?: boolean;
  contentSlotProps?: Record<string, unknown>;
  defaultExpanded?: DocsSidebarDefaultExpanded;
  expandedIds?: readonly string[];
  indicatorSlotProps?: Record<string, unknown>;
  onExpandedChange?: (expandedIds: readonly string[]) => void;
  triggerSlotProps?: Record<string, unknown>;
  childrenSlotProps?: Record<string, unknown>;
  itemSlotProps?: Record<string, unknown>;
  linkSlotProps?: Record<string, unknown>;
  listSlotProps?: Record<string, unknown>;
  sectionTitleSlotProps?: Record<string, unknown>;
}

export interface DocsMobileNavigationOpenChangeDetails {
  open: boolean;
}

export interface DocsMobileNavigationRootProps extends DocsComponentProps {
  closeOnNavigate?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (details: DocsMobileNavigationOpenChangeDetails) => void;
  open?: boolean;
  search?: ReactNode;
  sidebarContent?: ReactNode;
  sidebarProps?: Omit<DocsSidebarProps, 'nav' | 'page'>;
  title?: ReactNode;
}

export interface DocsMobileNavigationTriggerProps {
  ariaLabel?: string;
  children?: ReactNode;
  icon?: ReactNode;
  iconSlotProps?: Record<string, unknown>;
  label?: ReactNode;
  labelSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
}

export interface DocsMobileNavigationContentProps {
  backdropSlotProps?: Record<string, unknown>;
  children?: ReactNode;
  positionerSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
}

export interface DocsMobileNavigationPartProps {
  children?: ReactNode;
  slotProps?: Record<string, unknown>;
}

export interface DocsMobileNavigationCloseTriggerProps extends DocsMobileNavigationPartProps {
  ariaLabel?: string;
}

export type DocsMobileNavigationSidebarProps = Omit<
  DocsSidebarProps,
  'nav' | 'page'
>;

export interface DocsTableOfContentsProps extends DocsStickyComponentProps {
  scrollMarginTop?: ChakraDocsStickyTop;
  activeIndicatorSlotProps?: Record<string, unknown>;
  itemSlotProps?: Record<string, unknown>;
  labelSlotProps?: Record<string, unknown>;
  linkSlotProps?: Record<string, unknown>;
  listSlotProps?: Record<string, unknown>;
}

export interface DocsMobileTableOfContentsProps extends DocsTableOfContentsProps {
  contentSlotProps?: Record<string, unknown>;
  currentSlotProps?: Record<string, unknown>;
  indicatorSlotProps?: Record<string, unknown>;
  triggerLabelSlotProps?: Record<string, unknown>;
  triggerSlotProps?: Record<string, unknown>;
}

export interface DocsBreadcrumbsProps extends DocsComponentProps {
  currentSlotProps?: Record<string, unknown>;
  homeHref?: string;
  homeLabel?: string;
  itemSlotProps?: Record<string, unknown>;
  linkSlotProps?: Record<string, unknown>;
  listSlotProps?: Record<string, unknown>;
  separator?: ReactNode;
  separatorSlotProps?: Record<string, unknown>;
}

export interface DocsHeadingPermalinkProps {
  children?: ReactNode;
  copiedLabel?: string;
  headingId: string;
  href?: string;
  indicatorSlotProps?: Record<string, unknown>;
  label?: string;
  slotProps?: Record<string, unknown>;
  title?: string;
  triggerSlotProps?: Record<string, unknown>;
}

export type DocsPageFeedbackValue = 'helpful' | 'not-helpful' | (string & {});

export interface DocsPageFeedbackSubmitDetails {
  comment: string;
  page?: DocsPage;
  value: DocsPageFeedbackValue;
}

export interface DocsPageFeedbackRootProps {
  children?: ReactNode;
  comment?: string;
  defaultComment?: string;
  defaultValue?: DocsPageFeedbackValue;
  onCommentChange?: (comment: string) => void;
  onSubmit?: (details: DocsPageFeedbackSubmitDetails) => void | Promise<void>;
  onValueChange?: (value: DocsPageFeedbackValue) => void;
  page?: DocsPage;
  slotProps?: Record<string, unknown>;
  value?: DocsPageFeedbackValue;
}

export interface DocsPageFeedbackPartProps {
  children?: ReactNode;
  slotProps?: Record<string, unknown>;
}

export interface DocsPageFeedbackOptionProps extends DocsPageFeedbackPartProps {
  value: DocsPageFeedbackValue;
}

export interface DocsPageFeedbackCommentProps extends DocsPageFeedbackPartProps {
  label?: string;
  placeholder?: string;
}

export interface DocsCardsRootProps {
  children?: ReactNode;
  slotProps?: Record<string, unknown>;
}

export interface DocsCardProps {
  badge?: ReactNode;
  badgeSlotProps?: Record<string, unknown>;
  children?: ReactNode;
  contentSlotProps?: Record<string, unknown>;
  description?: ReactNode;
  descriptionSlotProps?: Record<string, unknown>;
  href?: string;
  icon?: ReactNode;
  iconSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
  title: ReactNode;
  titleSlotProps?: Record<string, unknown>;
}

export interface DocsStepsRootProps {
  children?: ReactNode;
  slotProps?: Record<string, unknown>;
}

export interface DocsStepProps {
  children?: ReactNode;
  contentSlotProps?: Record<string, unknown>;
  description?: ReactNode;
  descriptionSlotProps?: Record<string, unknown>;
  indicator?: ReactNode;
  indicatorSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
  title?: ReactNode;
  titleSlotProps?: Record<string, unknown>;
}

export interface DocsTabsRootProps {
  children?: ReactNode;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  slotProps?: Record<string, unknown>;
  syncKey?: string;
  value?: string;
}

export interface DocsTabsPartProps {
  children?: ReactNode;
  slotProps?: Record<string, unknown>;
}

export interface DocsTabsValuePartProps extends DocsTabsPartProps {
  value: string;
}

export interface DocsApiTableItem {
  defaultValue?: ReactNode;
  description?: ReactNode;
  name: string;
  required?: boolean;
  type?: ReactNode;
}

export interface DocsApiTableProps {
  caption?: ReactNode;
  captionSlotProps?: Record<string, unknown>;
  cellSlotProps?: Record<string, unknown>;
  columnHeaderSlotProps?: Record<string, unknown>;
  defaultLabel?: string;
  defaultValueSlotProps?: Record<string, unknown>;
  descriptionLabel?: string;
  descriptionSlotProps?: Record<string, unknown>;
  headerSlotProps?: Record<string, unknown>;
  items: readonly DocsApiTableItem[];
  nameLabel?: string;
  nameSlotProps?: Record<string, unknown>;
  requiredLabel?: string;
  requiredSlotProps?: Record<string, unknown>;
  rowSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
  tableSlotProps?: Record<string, unknown>;
  typeLabel?: string;
  typeSlotProps?: Record<string, unknown>;
}

export interface DocsBadgeProps {
  children?: ReactNode;
  colorPalette?: string;
  slotProps?: Record<string, unknown>;
  tone?: 'neutral' | 'accent';
}

export interface DocsSearchProps {
  records?: readonly DocsSearchRecord[];
  searchProvider?: DocsSearchProvider;
  /** Curated, ordered results shown only for an empty query. An empty array opts out of provider defaults. */
  defaultResults?: readonly DocsSearchResult[];
  /** Heading for curated results. Defaults to "Recommended". */
  defaultResultsLabel?: string;
  debounceMs?: number;
  collectionId?: string;
  collectionIds?: readonly string[];
  limit?: number;
  popularLimit?: number;
  placeholder?: string;
  onNavigate?: (href: string, result: DocsSearchResult) => void;
  onResultSelect?: (result: DocsSearchResult) => void;
  backdropSlotProps?: Record<string, unknown>;
  bodySlotProps?: Record<string, unknown>;
  contentSlotProps?: Record<string, unknown>;
  headerSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
  positionerSlotProps?: Record<string, unknown>;
  resultBadgeSlotProps?: Record<string, unknown>;
  resultContentSlotProps?: Record<string, unknown>;
  resultDescriptionSlotProps?: Record<string, unknown>;
  resultLinkSlotProps?: Record<string, unknown>;
  resultListSlotProps?: Record<string, unknown>;
  triggerSlotProps?: Record<string, unknown>;
  triggerLabelSlotProps?: Record<string, unknown>;
  shortcutSlotProps?: Record<string, unknown>;
  inputSlotProps?: Record<string, unknown>;
  resultSlotProps?: Record<string, unknown>;
  resultRowSlotProps?: Record<string, unknown>;
  resultTitleSlotProps?: Record<string, unknown>;
  resultsSlotProps?: Record<string, unknown>;
  sectionLabelSlotProps?: Record<string, unknown>;
  statusSlotProps?: Record<string, unknown>;
  titleSlotProps?: Record<string, unknown>;
}

export type DocsVersionOption = DocsCollectionOption;

export interface DocsVersionSelectProps {
  collections?: DocsCollection[];
  options?: DocsVersionOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (collectionId: string) => void;
  includeAll?: boolean;
  allValue?: string;
  allLabel?: string;
  label?: string;
  labelHidden?: boolean;
  slotProps?: Record<string, unknown>;
  labelSlotProps?: Record<string, unknown>;
  selectSlotProps?: Record<string, unknown>;
}

export interface DocsPaginationProps extends DocsComponentProps {
  itemSlotProps?: Record<string, unknown>;
  labelSlotProps?: Record<string, unknown>;
  linkSlotProps?: Record<string, unknown>;
}

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; code: string; language?: string }
  | { type: 'quote'; text: string };

export interface MarkdownContentProps {
  getHeadingHref?: (headingId: string) => string;
  headingPermalinkIndicatorSlotProps?: Record<string, unknown>;
  headingPermalinkSlotProps?: Record<string, unknown>;
  headingPermalinkTriggerSlotProps?: Record<string, unknown>;
  headingPermalinks?: boolean;
  source: string;
  slotProps?: Record<string, unknown>;
  codeBlockProps?: Omit<CodeBlockProps, 'children' | 'code' | 'language'>;
  codeBlockSlotProps?: Record<string, unknown>;
  headingSlotProps?: Record<string, unknown>;
  inlineCodeSlotProps?: Record<string, unknown>;
  linkSlotProps?: Record<string, unknown>;
  listItemSlotProps?: Record<string, unknown>;
  listSlotProps?: Record<string, unknown>;
  paragraphSlotProps?: Record<string, unknown>;
  quoteSlotProps?: Record<string, unknown>;
}

type DocsInputChangeEvent = {
  currentTarget: {
    value: string;
  };
};

type DocsKeyboardEvent = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  defaultPrevented?: boolean;
  isComposing?: boolean;
  nativeEvent?: { isComposing?: boolean };
  preventDefault: () => void;
};

const defaultLabels: DocsLabels = {
  search: 'Search',
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
  copiedPage: 'Copied',
  copyLink: 'Copy link',
  copyLinkDescription: 'Copy a link to this page',
  copiedLink: 'Copied',
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

interface DocsPageActionsContextValue {
  config: ChakraDocsConfig;
  editUrl?: string;
  inMenu: boolean;
  markdown?: string;
  markdownUrl?: string;
  page?: DocsPage;
  pageUrl?: string;
  styles: Record<string, unknown>;
}

const DocsPageActionsContext = createContext<
  DocsPageActionsContextValue | undefined
>(undefined);

function useDocsPageActionsContext(): DocsPageActionsContextValue {
  const context = useContext(DocsPageActionsContext);

  if (!context) {
    throw new Error(
      'DocsPageActions components must be rendered inside DocsPageActions.Root.',
    );
  }

  return context;
}

export function DocsPageActionsRoot(
  props: DocsPageActionsRootProps,
): ReactNode {
  const config = useDocsConfig();
  const page = props.page;
  const markdown = props.markdown ?? page?.body;
  const pageUrl = props.pageUrl ?? resolvePageActionUrl(page, config.siteUrl);
  const markdownUrl = props.markdownUrl;
  const editUrl =
    props.editUrl ??
    (page && config.editUrl ? config.editUrl(page) : undefined);
  const automaticComposition = props.children === undefined;
  const hasPrimaryAction = markdown !== undefined;
  const hasMenu = Boolean(pageUrl || markdownUrl || editUrl);
  const effectiveVariant =
    props.variant === 'split' &&
    (!automaticComposition || (hasPrimaryAction && hasMenu))
      ? 'split'
      : 'default';
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.pageActions,
    chakraDocsPageActionsSlotRecipe,
  );
  const styles = recipe({
    size: props.size ?? 'md',
    variant: effectiveVariant,
  });
  const context: DocsPageActionsContextValue = {
    config,
    editUrl,
    inMenu: false,
    markdown,
    markdownUrl,
    page,
    pageUrl,
    styles,
  };
  const children =
    props.children ??
    createElement(
      Fragment,
      null,
      hasPrimaryAction ? createElement(DocsPageActionsCopyPage) : null,
      hasMenu
        ? createElement(
            DocsPageActionsMenu,
            hasPrimaryAction && effectiveVariant === 'split'
              ? {
                  ariaLabel:
                    config.labels?.moreActions ?? defaultLabels.moreActions,
                  indicator: createElement(PageActionsChevronIcon),
                  label: null,
                }
              : null,
            hasPrimaryAction ? createElement(DocsPageActionsCopyPage) : null,
            pageUrl ? createElement(DocsPageActionsCopyLink) : null,
            markdownUrl ? createElement(DocsPageActionsViewMarkdown) : null,
            editUrl ? createElement(DocsPageActionsEdit) : null,
          )
        : null,
    );

  return createElement(
    DocsPageActionsContext.Provider,
    { value: context },
    createElement(
      Box,
      mergeSlotStyleProps(styles.root, props.slotProps),
      children,
    ),
  );
}

export function DocsPageActionsCopyPage(props: DocsPageActionProps): ReactNode {
  const context = useDocsPageActionsContext();
  const labels = context.config.labels ?? defaultLabels;

  if (context.markdown === undefined) {
    return null;
  }

  return createCopyPageAction({
    children: props.children,
    context,
    copiedLabel:
      props.copiedLabel ?? labels.copiedPage ?? defaultLabels.copiedPage,
    description: resolvePageActionDescription(
      props.description,
      context,
      labels.copyPageDescription ?? defaultLabels.copyPageDescription,
    ),
    descriptionSlotProps: props.descriptionSlotProps,
    format: 'markdown',
    icon: props.icon,
    iconSlotProps: props.iconSlotProps,
    indicatorSlotProps: props.indicatorSlotProps,
    label: props.label ?? labels.copyPage ?? defaultLabels.copyPage,
    labelSlotProps: props.labelSlotProps,
    slotProps: props.slotProps,
    value: context.markdown,
  });
}

export function DocsPageActionsCopyLink(props: DocsPageActionProps): ReactNode {
  const context = useDocsPageActionsContext();
  const labels = context.config.labels ?? defaultLabels;

  if (!context.pageUrl) {
    return null;
  }

  return createCopyPageAction({
    children: props.children,
    context,
    copiedLabel:
      props.copiedLabel ?? labels.copiedLink ?? defaultLabels.copiedLink,
    description: resolvePageActionDescription(
      props.description,
      context,
      labels.copyLinkDescription ?? defaultLabels.copyLinkDescription,
    ),
    descriptionSlotProps: props.descriptionSlotProps,
    format: 'link',
    icon: props.icon,
    iconSlotProps: props.iconSlotProps,
    indicatorSlotProps: props.indicatorSlotProps,
    label: props.label ?? labels.copyLink ?? defaultLabels.copyLink,
    labelSlotProps: props.labelSlotProps,
    slotProps: props.slotProps,
    value: context.pageUrl,
  });
}

export function DocsPageActionsViewMarkdown(
  props: DocsPageActionLinkProps,
): ReactNode {
  const context = useDocsPageActionsContext();
  const labels = context.config.labels ?? defaultLabels;
  const href = props.href ?? context.markdownUrl;

  if (!href) {
    return null;
  }

  return createPageActionLink({
    action: 'view-markdown',
    children: props.children,
    context,
    description: resolvePageActionDescription(
      props.description,
      context,
      labels.viewMarkdownDescription ?? defaultLabels.viewMarkdownDescription,
    ),
    descriptionSlotProps: props.descriptionSlotProps,
    href,
    icon: props.icon,
    iconSlotProps: props.iconSlotProps,
    label: props.label ?? labels.viewMarkdown ?? defaultLabels.viewMarkdown,
    labelSlotProps: props.labelSlotProps,
    slotProps: props.slotProps,
  });
}

export function DocsPageActionsEdit(props: DocsPageActionLinkProps): ReactNode {
  const context = useDocsPageActionsContext();
  const labels = context.config.labels ?? defaultLabels;
  const href = props.href ?? context.editUrl;

  if (!href) {
    return null;
  }

  return createPageActionLink({
    action: 'edit',
    children: props.children,
    context,
    description: resolvePageActionDescription(
      props.description,
      context,
      labels.editPageDescription ?? defaultLabels.editPageDescription,
    ),
    descriptionSlotProps: props.descriptionSlotProps,
    href,
    icon: props.icon,
    iconSlotProps: props.iconSlotProps,
    label: props.label ?? labels.editPage ?? defaultLabels.editPage,
    labelSlotProps: props.labelSlotProps,
    slotProps: props.slotProps,
  });
}

export function DocsPageActionsMenu(
  props: DocsPageActionsMenuProps,
): ReactNode {
  const context = useDocsPageActionsContext();
  const labels = context.config.labels ?? defaultLabels;
  const defaultLabel = labels.moreActions ?? defaultLabels.moreActions;

  return usePageActionsDisclosure({
    ...props,
    ariaLabel:
      props.ariaLabel ??
      (typeof props.label === 'string' ? props.label : defaultLabel),
    context,
    label:
      props.label !== undefined
        ? props.label
        : props.icon || props.indicator
          ? undefined
          : defaultLabel,
    slots: {
      content: context.styles.menuContent,
      indicator: context.styles.menuIndicator,
      positioner: context.styles.menuPositioner,
      root: context.styles.menu,
      trigger: [context.styles.trigger, context.styles.menuTrigger],
    },
  });
}

function PageActionsChevronIcon(): ReactNode {
  return createElement(
    'svg',
    {
      'aria-hidden': 'true',
      fill: 'none',
      height: '1em',
      viewBox: '0 0 16 16',
      width: '1em',
    },
    createElement('path', {
      d: 'm4 6 4 4 4-4',
      stroke: 'currentColor',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: '1.5',
    }),
  );
}

export function DocsPageActionsSubmenu(
  props: DocsPageActionsSubmenuProps,
): ReactNode {
  const context = useDocsPageActionsContext();

  return usePageActionsDisclosure({
    ...props,
    ariaLabel:
      props.ariaLabel ??
      (typeof props.label === 'string' ? props.label : undefined),
    context,
    indicator: props.indicator ?? '›',
    nested: true,
    slots: {
      content: context.styles.submenuContent,
      indicator: context.styles.submenuIndicator,
      positioner: context.styles.submenuPositioner,
      root: context.styles.submenu,
      trigger: [context.styles.menuItem, context.styles.submenuTrigger],
    },
  });
}

export function DocsPageActionsGroup(
  props: DocsPageActionsGroupProps,
): ReactNode {
  const context = useDocsPageActionsContext();
  const labelId = useId();

  return createElement(
    ChakraMenu.ItemGroup,
    {
      'aria-label': props.ariaLabel,
      'aria-labelledby': !props.ariaLabel && props.label ? labelId : undefined,
      unstyled: true,
      ...mergeSlotStyleProps(context.styles.menuGroup, props.slotProps),
    },
    props.label
      ? createElement(
          ChakraMenu.ItemGroupLabel,
          {
            id: labelId,
            unstyled: true,
            ...mergeSlotStyleProps(
              context.styles.menuGroupLabel,
              props.labelSlotProps,
            ),
          },
          props.label,
        )
      : null,
    props.children,
  );
}

export function DocsPageActionsSeparator(
  props: DocsPageActionsSeparatorProps,
): ReactNode {
  const context = useDocsPageActionsContext();

  return createElement(ChakraMenu.Separator, {
    unstyled: true,
    ...mergeSlotStyleProps(context.styles.menuSeparator, props.slotProps),
  });
}

interface PageActionsDisclosureProps extends DocsPageActionsMenuProps {
  context: DocsPageActionsContextValue;
  nested?: boolean;
  slots: {
    content: unknown;
    indicator: unknown;
    positioner: unknown;
    root: unknown;
    trigger: unknown;
  };
}

interface PageActionClickEvent {
  defaultPrevented?: boolean;
  preventDefault?: () => void;
}

function usePageActionsDisclosure(
  props: PageActionsDisclosureProps,
): ReactNode {
  const disclosureId = useId();
  const menuContext: DocsPageActionsContextValue = {
    ...props.context,
    inMenu: true,
  };
  const triggerProps = mergeSlotStyleProps(
    props.slots.trigger,
    props.triggerSlotProps,
  );
  const triggerContent = createPageActionsDisclosureTrigger(props);
  const trigger = props.nested
    ? createElement(
        ChakraMenu.TriggerItem,
        {
          ...triggerProps,
          'aria-label': props.ariaLabel,
          unstyled: true,
          value: `submenu-${disclosureId}`,
        },
        triggerContent,
      )
    : createElement(
        ChakraMenu.Trigger,
        { asChild: true },
        createElement(
          Button,
          {
            type: 'button',
            ...triggerProps,
            'aria-label': props.ariaLabel,
          },
          triggerContent,
        ),
      );
  const defaultPositioning: DocsPageActionsPositioning = props.nested
    ? {
        flip: true,
        gutter: 4,
        overflowPadding: 8,
        placement: 'right-start',
        slide: true,
      }
    : {
        flip: true,
        gutter: 8,
        overflowPadding: 8,
        placement: 'bottom-end',
        slide: true,
      };
  const positioning = { ...defaultPositioning, ...props.positioning };

  return createElement(
    ChakraMenu.Root,
    {
      closeOnSelect: props.closeOnSelect ?? true,
      defaultOpen: props.defaultOpen,
      id: disclosureId,
      loopFocus: true,
      onOpenChange: (details: { open: boolean }) =>
        props.onOpenChange?.({ open: details.open }),
      open: props.open,
      positioning,
      typeahead: true,
      unstyled: true,
    },
    createElement(
      Box,
      mergeSlotStyleProps(props.slots.root, props.slotProps),
      trigger,
      createElement(
        Portal,
        null,
        createElement(
          ChakraMenu.Positioner,
          {
            unstyled: true,
            ...mergeSlotStyleProps(
              props.slots.positioner,
              props.positionerSlotProps,
            ),
          },
          createElement(
            ChakraMenu.Content,
            {
              unstyled: true,
              ...mergeSlotStyleProps(
                props.slots.content,
                props.contentSlotProps,
              ),
            },
            createElement(
              DocsPageActionsContext.Provider,
              { value: menuContext },
              props.children,
            ),
          ),
        ),
      ),
    ),
  );
}

function createPageActionsDisclosureTrigger(
  props: PageActionsDisclosureProps,
): ReactNode {
  return createElement(
    Fragment,
    null,
    props.icon
      ? createElement(
          Box,
          {
            as: 'span',
            ...mergeSlotStyleProps(
              props.context.styles.icon,
              props.iconSlotProps,
            ),
          },
          props.icon,
        )
      : null,
    props.label
      ? createElement(
          Box,
          {
            as: 'span',
            ...mergeSlotStyleProps(
              props.context.styles.label,
              props.labelSlotProps,
            ),
          },
          props.label,
        )
      : null,
    props.indicator
      ? createElement(
          ChakraMenu.Indicator,
          {
            'aria-hidden': 'true',
            unstyled: true,
            ...mergeSlotStyleProps(
              props.slots.indicator,
              props.indicatorSlotProps,
            ),
          },
          props.indicator,
        )
      : null,
  );
}

export function DocsPageActionsItem(
  props: DocsPageActionsItemProps,
): ReactNode {
  const context = useDocsPageActionsContext();
  const itemId = useId();
  const action = props.action ?? 'custom';

  if (props.href) {
    return createPageActionLink({
      action,
      children: props.children,
      context,
      description: props.description,
      descriptionSlotProps: props.descriptionSlotProps,
      href: props.href,
      icon: props.icon,
      iconSlotProps: props.iconSlotProps,
      label: props.label ?? action,
      labelSlotProps: props.labelSlotProps,
      onSelect: props.onSelect,
      slotProps: props.slotProps,
    });
  }

  const slotProps = getPageActionSlotProps(context, props.slotProps);
  const onClick = slotProps.onClick;

  const item = createElement(
    Button,
    {
      type: 'button',
      ...slotProps,
      onClick: (event: PageActionClickEvent) => {
        callPageActionClickHandler(onClick, event);

        if (event.defaultPrevented) {
          return;
        }

        props.onSelect?.();
        context.config.analytics?.onPageAction?.({
          action,
          page: context.page,
        });
      },
    },
    createPageActionContent(context, props),
  );

  return context.inMenu
    ? createElement(
        ChakraMenu.Item,
        { asChild: true, unstyled: true, value: `${action}-${itemId}` },
        item,
      )
    : item;
}

export const DocsPageActions = {
  Root: DocsPageActionsRoot,
  CopyPage: DocsPageActionsCopyPage,
  CopyLink: DocsPageActionsCopyLink,
  ViewMarkdown: DocsPageActionsViewMarkdown,
  Edit: DocsPageActionsEdit,
  Menu: DocsPageActionsMenu,
  Submenu: DocsPageActionsSubmenu,
  Group: DocsPageActionsGroup,
  Separator: DocsPageActionsSeparator,
  Item: DocsPageActionsItem,
} as const;

function createCopyPageAction(props: {
  children?: ReactNode;
  context: DocsPageActionsContextValue;
  copiedLabel: string;
  description?: ReactNode;
  descriptionSlotProps?: Record<string, unknown>;
  format: 'markdown' | 'link';
  icon?: ReactNode;
  iconSlotProps?: Record<string, unknown>;
  indicatorSlotProps?: Record<string, unknown>;
  label: string;
  labelSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
  value: string;
}): ReactNode {
  const { context } = props;
  const triggerProps = getPageActionSlotProps(context, props.slotProps);
  const onClick = triggerProps.onClick;
  const trigger = createElement(
    ChakraClipboard.Trigger,
    {
      type: 'button',
      'aria-label': props.label,
      ...triggerProps,
      onClick: (event: PageActionClickEvent) => {
        callPageActionClickHandler(onClick, event);
      },
    },
    props.icon
      ? createElement(
          Box,
          {
            as: 'span',
            ...mergeSlotStyleProps(context.styles.icon, props.iconSlotProps),
          },
          props.icon,
        )
      : null,
    createElement(
      Box,
      { as: 'span' },
      createElement(
        ChakraClipboard.Indicator,
        {
          copied: props.copiedLabel,
          ...mergeSlotStyleProps(
            context.styles.indicator,
            props.indicatorSlotProps,
          ),
        },
        createElement(
          Box,
          {
            as: 'span',
            ...mergeSlotStyleProps(context.styles.label, props.labelSlotProps),
          },
          props.children ?? props.label,
        ),
      ),
      props.description
        ? createElement(
            Text,
            {
              as: 'span',
              ...mergeSlotStyleProps(
                context.styles.description,
                props.descriptionSlotProps,
              ),
            },
            props.description,
          )
        : null,
    ),
  );
  const item = context.inMenu
    ? createElement(
        ChakraMenu.Item,
        {
          asChild: true,
          unstyled: true,
          value: props.format === 'markdown' ? 'copy-page' : 'copy-link',
          valueText: props.label,
        },
        trigger,
      )
    : trigger;

  return createElement(
    ChakraClipboard.Root,
    {
      value: props.value,
      onStatusChange: (details: { copied: boolean }) => {
        if (details.copied) {
          context.config.analytics?.onPageCopy?.({
            format: props.format,
            page: context.page,
            value: props.value,
          });
        }
      },
      ...mergeSlotStyleProps(context.styles.copyRoot, undefined),
    },
    item,
  );
}

function createPageActionLink(props: {
  action: string;
  children?: ReactNode;
  context: DocsPageActionsContextValue;
  description?: ReactNode;
  descriptionSlotProps?: Record<string, unknown>;
  href: string;
  icon?: ReactNode;
  iconSlotProps?: Record<string, unknown>;
  label: string;
  labelSlotProps?: Record<string, unknown>;
  onSelect?: () => void;
  slotProps?: Record<string, unknown>;
}): ReactNode {
  if (!isSafeLinkHref(props.href)) {
    return null;
  }

  const slotProps = getPageActionSlotProps(props.context, props.slotProps);
  const onClick = slotProps.onClick;

  const link = createElement(
    DocsLink,
    {
      href: props.href,
      ...slotProps,
      onClick: (event: PageActionClickEvent) => {
        callPageActionClickHandler(onClick, event);

        if (event.defaultPrevented) {
          return;
        }

        props.onSelect?.();
        props.context.config.analytics?.onPageAction?.({
          action: props.action,
          href: props.href,
          page: props.context.page,
        });
      },
    },
    createPageActionContent(props.context, props),
  );

  return props.context.inMenu
    ? createElement(
        ChakraMenu.Item,
        {
          asChild: true,
          unstyled: true,
          value: `${props.action}:${props.href}`,
          valueText: props.label,
        },
        link,
      )
    : link;
}

function resolvePageActionDescription(
  description: ReactNode | undefined,
  context: DocsPageActionsContextValue,
  defaultDescription: ReactNode,
): ReactNode {
  if (description !== undefined) {
    return description;
  }

  return context.inMenu ? defaultDescription : undefined;
}

function getPageActionSlotProps(
  context: DocsPageActionsContextValue,
  slotProps: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return mergeSlotStyleProps(
    context.inMenu
      ? context.styles.menuItem
      : [context.styles.trigger, context.styles.primaryTrigger],
    slotProps,
  );
}

function callPageActionClickHandler(
  handler: unknown,
  event: PageActionClickEvent,
): void {
  if (typeof handler === 'function') {
    (handler as (event: PageActionClickEvent) => void)(event);
  }
}

function createPageActionContent(
  context: DocsPageActionsContextValue,
  props: Pick<
    DocsPageActionProps,
    | 'description'
    | 'descriptionSlotProps'
    | 'children'
    | 'icon'
    | 'iconSlotProps'
    | 'label'
    | 'labelSlotProps'
  >,
): ReactNode {
  return createElement(
    Fragment,
    null,
    props.icon
      ? createElement(
          Box,
          {
            as: 'span',
            ...mergeSlotStyleProps(context.styles.icon, props.iconSlotProps),
          },
          props.icon,
        )
      : null,
    createElement(
      Box,
      { as: 'span' },
      createElement(
        Box,
        {
          as: 'span',
          ...mergeSlotStyleProps(context.styles.label, props.labelSlotProps),
        },
        props.children ?? props.label,
      ),
      props.description
        ? createElement(
            Text,
            {
              as: 'span',
              ...mergeSlotStyleProps(
                context.styles.description,
                props.descriptionSlotProps,
              ),
            },
            props.description,
          )
        : null,
    ),
  );
}

function resolvePageActionUrl(
  page: DocsPage | undefined,
  siteUrl: string | undefined,
): string | undefined {
  if (!page) {
    return undefined;
  }

  if (!siteUrl) {
    return page.route;
  }

  try {
    return new URL(page.route, siteUrl).toString();
  } catch {
    return page.route;
  }
}

export function DocsLayout(props: DocsLayoutProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.layout,
    chakraDocsLayoutSlotRecipe,
  );
  const styles = recipe();
  const mobileNavigationProps = props.mobileNavigationProps ?? {};
  const mobileNavigationSidebarProps = mobileNavigationProps.sidebarProps ?? {};

  return createElement(
    Container,
    mergeSlotStyleProps(styles.root, props.slotProps),
    props.nav && props.mobileNavigation !== false
      ? createElement(DocsMobileNavigationRoot, {
          ...mobileNavigationProps,
          nav: props.nav,
          page: props.page,
          sidebarContent:
            mobileNavigationProps.sidebarContent !== undefined
              ? mobileNavigationProps.sidebarContent
              : props.sidebarContent,
          sidebarProps: {
            badgeSlotProps: props.sidebarBadgeSlotProps,
            collapsible: props.sidebarCollapsible,
            contentSlotProps: props.sidebarContentSlotProps,
            defaultExpanded: props.sidebarDefaultExpanded,
            expandedIds: props.sidebarExpandedIds,
            indicatorSlotProps: props.sidebarIndicatorSlotProps,
            onExpandedChange: props.onSidebarExpandedChange,
            triggerSlotProps: props.sidebarTriggerSlotProps,
            ...mobileNavigationSidebarProps,
          },
          slotProps: mergeComponentSlotProps(
            styles.mobileNavigation,
            mobileNavigationProps.slotProps,
          ),
        })
      : null,
    createElement(
      Box,
      mergeSlotStyleProps(styles.inner, props.innerSlotProps),
      props.nav
        ? createElement(
            DocsSidebar,
            {
              nav: props.nav,
              page: props.page,
              badgeSlotProps: props.sidebarBadgeSlotProps,
              collapsible: props.sidebarCollapsible,
              contentSlotProps: props.sidebarContentSlotProps,
              defaultExpanded: props.sidebarDefaultExpanded,
              expandedIds: props.sidebarExpandedIds,
              indicatorSlotProps: props.sidebarIndicatorSlotProps,
              onExpandedChange: props.onSidebarExpandedChange,
              triggerSlotProps: props.sidebarTriggerSlotProps,
              stickyTop: props.stickyTop,
              slotProps: mergeComponentSlotProps(
                styles.sidebar,
                props.sidebarSlotProps,
              ),
            },
            props.sidebarContent,
          )
        : null,
      createElement(
        Box,
        {
          as: 'div',
          ...mergeSlotStyleProps(styles.content, props.contentSlotProps),
        },
        props.headings && props.mobileToc !== false
          ? createElement(DocsMobileTableOfContents, {
              activeIndicatorSlotProps: props.mobileTocActiveIndicatorSlotProps,
              contentSlotProps: props.mobileTocContentSlotProps,
              currentSlotProps: props.mobileTocCurrentSlotProps,
              headings: props.headings,
              indicatorSlotProps: props.mobileTocIndicatorSlotProps,
              itemSlotProps: props.mobileTocItemSlotProps,
              linkSlotProps: props.mobileTocLinkSlotProps,
              listSlotProps: props.mobileTocListSlotProps,
              scrollMarginTop: props.scrollMarginTop,
              slotProps: props.mobileTocSlotProps,
              triggerLabelSlotProps: props.mobileTocTriggerLabelSlotProps,
              triggerSlotProps: props.mobileTocTriggerSlotProps,
            })
          : null,
        props.children ??
          createElement(DocsArticle, {
            page: props.page,
            headings: props.headings,
          }),
      ),
      props.headings
        ? createElement(DocsTableOfContents, {
            headings: props.headings,
            scrollMarginTop: props.scrollMarginTop,
            stickyTop: props.stickyTop,
            slotProps: props.tocSlotProps,
          })
        : null,
    ),
  );
}

export function DocsArticle(props: DocsArticleProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.article,
    chakraDocsArticleSlotRecipe,
  );
  const styles = recipe();

  return createElement(
    Box,
    {
      as: 'article',
      ...mergeSlotStyleProps(styles.root, props.slotProps),
    },
    props.page
      ? createElement(
          Box,
          mergeSlotStyleProps(styles.header, props.headerSlotProps),
          props.breadcrumbs
            ? createElement(
                Box,
                mergeSlotStyleProps(
                  styles.breadcrumbs,
                  props.breadcrumbsSlotProps,
                ),
                props.breadcrumbs,
              )
            : null,
          createElement(
            Box,
            mergeSlotStyleProps(styles.heading, props.headingSlotProps),
            createElement(
              Heading,
              {
                as: 'h1',
                size: '3xl',
                ...mergeSlotStyleProps(styles.title, props.titleSlotProps),
              },
              props.page.title,
            ),
            props.actions
              ? createElement(
                  Box,
                  mergeSlotStyleProps(styles.actions, props.actionsSlotProps),
                  props.actions,
                )
              : null,
          ),
          props.page.description
            ? createElement(
                Text,
                mergeSlotStyleProps(
                  styles.description,
                  props.descriptionSlotProps,
                ),
                props.page.description,
              )
            : null,
        )
      : null,
    props.children,
  );
}

export function DocsBreadcrumbs(props: DocsBreadcrumbsProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.breadcrumbs,
    chakraDocsBreadcrumbsSlotRecipe,
  );
  const styles = recipe();
  const items: DocsBreadcrumbItem[] = [
    ...(props.homeLabel
      ? [
          {
            id: 'home',
            title: props.homeLabel,
            href: props.homeHref,
          },
        ]
      : []),
    ...createDocsBreadcrumbItems(props.nav ?? [], props.page?.route),
  ];

  if (items.length === 0) {
    return null;
  }

  return createElement(
    Box,
    {
      as: 'nav',
      'aria-label': 'Breadcrumb',
      ...mergeSlotStyleProps(styles.root, props.slotProps),
    },
    createElement(
      Box,
      {
        as: 'ol',
        ...mergeSlotStyleProps(styles.list, props.listSlotProps),
      },
      items.map((item, index) => {
        const current = index === items.length - 1;

        return createElement(
          Box,
          {
            as: 'li',
            key: item.id,
            ...mergeSlotStyleProps(styles.item, props.itemSlotProps),
          },
          index > 0
            ? createElement(
                Box,
                {
                  as: 'span',
                  'aria-hidden': 'true',
                  ...mergeSlotStyleProps(
                    styles.separator,
                    props.separatorSlotProps,
                  ),
                },
                props.separator ?? '/',
              )
            : null,
          current || !item.href
            ? createElement(
                Box,
                {
                  as: 'span',
                  'aria-current': current ? 'page' : undefined,
                  ...mergeSlotStyleProps(
                    current ? styles.current : styles.link,
                    current ? props.currentSlotProps : props.linkSlotProps,
                  ),
                },
                item.title,
              )
            : createElement(
                DocsLink,
                {
                  href: item.href,
                  ...mergeSlotStyleProps(styles.link, props.linkSlotProps),
                },
                item.title,
              ),
        );
      }),
    ),
  );
}

export function DocsHeadingPermalink(
  props: DocsHeadingPermalinkProps,
): ReactNode {
  const config = useDocsConfig();
  const labels = config.labels ?? defaultLabels;
  const href = props.href ?? `#${props.headingId}`;
  const label =
    props.label ?? labels.copyHeadingLink ?? defaultLabels.copyHeadingLink;
  const copiedLabel =
    props.copiedLabel ??
    labels.copiedHeadingLink ??
    defaultLabels.copiedHeadingLink;
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.headingPermalink,
    chakraDocsHeadingPermalinkSlotRecipe,
  );
  const styles = recipe();

  if (!isSafeLinkHref(href)) {
    return null;
  }

  return createElement(
    ChakraClipboard.Root,
    {
      value: href,
      onStatusChange: (details: { copied: boolean }) => {
        if (details.copied) {
          config.analytics?.onHeadingLinkCopy?.({
            headingId: props.headingId,
            href,
            title: props.title,
          });
        }
      },
      ...mergeSlotStyleProps(styles.root, props.slotProps),
    },
    createElement(
      ChakraClipboard.Trigger,
      {
        type: 'button',
        'aria-label': label,
        title: label,
        ...mergeSlotStyleProps(styles.trigger, props.triggerSlotProps),
      },
      createElement(
        ChakraClipboard.Indicator,
        {
          copied: copiedLabel,
          ...mergeSlotStyleProps(styles.indicator, props.indicatorSlotProps),
        },
        props.children ?? '#',
      ),
    ),
  );
}

type DocsPageFeedbackStatus = 'idle' | 'submitting' | 'submitted' | 'error';

interface DocsPageFeedbackContextValue {
  comment: string;
  config: ChakraDocsConfig;
  page?: DocsPage;
  setComment: (comment: string) => void;
  setValue: (value: DocsPageFeedbackValue) => void;
  status: DocsPageFeedbackStatus;
  styles: Record<string, unknown>;
  submit: () => Promise<void>;
  value?: DocsPageFeedbackValue;
}

const DocsPageFeedbackContext = createContext<
  DocsPageFeedbackContextValue | undefined
>(undefined);

function useDocsPageFeedbackContext(): DocsPageFeedbackContextValue {
  const context = useContext(DocsPageFeedbackContext);

  if (!context) {
    throw new Error(
      'DocsPageFeedback components must be rendered inside DocsPageFeedback.Root.',
    );
  }

  return context;
}

export function DocsPageFeedbackRoot(
  props: DocsPageFeedbackRootProps,
): ReactNode {
  const config = useDocsConfig();
  const [uncontrolledValue, setUncontrolledValue] = useState(
    props.defaultValue ?? '',
  );
  const [uncontrolledComment, setUncontrolledComment] = useState(
    props.defaultComment ?? '',
  );
  const [status, setStatus] = useState<DocsPageFeedbackStatus>('idle');
  const value = props.value ?? uncontrolledValue;
  const comment = props.comment ?? uncontrolledComment;
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.feedback,
    chakraDocsFeedbackSlotRecipe,
  );
  const styles = recipe({ status });

  function setValue(nextValue: DocsPageFeedbackValue) {
    if (props.value === undefined) {
      setUncontrolledValue(nextValue);
    }

    setStatus('idle');
    props.onValueChange?.(nextValue);
  }

  function setComment(nextComment: string) {
    if (props.comment === undefined) {
      setUncontrolledComment(nextComment);
    }

    setStatus('idle');
    props.onCommentChange?.(nextComment);
  }

  async function submit() {
    if (!value || status === 'submitting' || status === 'submitted') {
      return;
    }

    const details = { comment, page: props.page, value };
    setStatus('submitting');

    try {
      await props.onSubmit?.(details);
      config.analytics?.onPageFeedback?.(details);
      setStatus('submitted');
    } catch {
      setStatus('error');
    }
  }

  const context: DocsPageFeedbackContextValue = {
    comment,
    config,
    page: props.page,
    setComment,
    setValue,
    status,
    styles,
    submit,
    value,
  };
  const children =
    props.children ??
    createElement(
      Fragment,
      null,
      createElement(DocsPageFeedbackPrompt),
      createElement(
        DocsPageFeedbackChoices,
        null,
        createElement(DocsPageFeedbackOption, { value: 'helpful' }),
        createElement(DocsPageFeedbackOption, { value: 'not-helpful' }),
      ),
      value ? createElement(DocsPageFeedbackComment) : null,
      value
        ? createElement(
            DocsPageFeedbackActions,
            null,
            createElement(DocsPageFeedbackSubmit),
          )
        : null,
      createElement(DocsPageFeedbackStatus),
    );

  return createElement(
    DocsPageFeedbackContext.Provider,
    { value: context },
    createElement(
      Box,
      {
        as: 'form',
        onSubmit: (event: { preventDefault: () => void }) => {
          event.preventDefault();
          void submit();
        },
        ...mergeSlotStyleProps(styles.root, props.slotProps),
      },
      children,
    ),
  );
}

export function DocsPageFeedbackPrompt(
  props: DocsPageFeedbackPartProps,
): ReactNode {
  const context = useDocsPageFeedbackContext();
  const labels = context.config.labels ?? defaultLabels;

  return createElement(
    Text,
    mergeSlotStyleProps(context.styles.prompt, props.slotProps),
    props.children ?? labels.feedbackPrompt ?? defaultLabels.feedbackPrompt,
  );
}

export function DocsPageFeedbackChoices(
  props: DocsPageFeedbackPartProps,
): ReactNode {
  const context = useDocsPageFeedbackContext();

  return createElement(
    Box,
    mergeSlotStyleProps(context.styles.choices, props.slotProps),
    props.children,
  );
}

export function DocsPageFeedbackOption(
  props: DocsPageFeedbackOptionProps,
): ReactNode {
  const context = useDocsPageFeedbackContext();
  const labels = context.config.labels ?? defaultLabels;
  const selected = context.value === props.value;
  const optionStyles = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.feedback,
    chakraDocsFeedbackSlotRecipe,
  )({ selected, status: context.status });
  const defaultLabel =
    props.value === 'helpful'
      ? (labels.feedbackHelpful ?? defaultLabels.feedbackHelpful)
      : props.value === 'not-helpful'
        ? (labels.feedbackNotHelpful ?? defaultLabels.feedbackNotHelpful)
        : props.value;

  return createElement(
    Button,
    {
      type: 'button',
      'aria-pressed': selected,
      disabled:
        context.status === 'submitting' || context.status === 'submitted',
      onClick: () => context.setValue(props.value),
      ...mergeSlotStyleProps(optionStyles.option, props.slotProps),
    },
    props.children ?? defaultLabel,
  );
}

export function DocsPageFeedbackComment(
  props: DocsPageFeedbackCommentProps,
): ReactNode {
  const context = useDocsPageFeedbackContext();
  const labels = context.config.labels ?? defaultLabels;
  const placeholder =
    props.placeholder ??
    labels.feedbackCommentPlaceholder ??
    defaultLabels.feedbackCommentPlaceholder;

  return createElement(Textarea, {
    'aria-label': props.label ?? placeholder,
    disabled: context.status === 'submitting' || context.status === 'submitted',
    onChange: (event: { currentTarget: { value: string } }) =>
      context.setComment(event.currentTarget.value),
    placeholder,
    value: context.comment,
    ...mergeSlotStyleProps(context.styles.comment, props.slotProps),
  });
}

export function DocsPageFeedbackActions(
  props: DocsPageFeedbackPartProps,
): ReactNode {
  const context = useDocsPageFeedbackContext();

  return createElement(
    Box,
    mergeSlotStyleProps(context.styles.actions, props.slotProps),
    props.children,
  );
}

export function DocsPageFeedbackSubmit(
  props: DocsPageFeedbackPartProps,
): ReactNode {
  const context = useDocsPageFeedbackContext();
  const labels = context.config.labels ?? defaultLabels;
  const label =
    context.status === 'submitting'
      ? (labels.feedbackSubmitting ?? defaultLabels.feedbackSubmitting)
      : (labels.feedbackSubmit ?? defaultLabels.feedbackSubmit);

  return createElement(
    Button,
    {
      type: 'submit',
      disabled:
        !context.value ||
        context.status === 'submitting' ||
        context.status === 'submitted',
      ...mergeSlotStyleProps(context.styles.submit, props.slotProps),
    },
    props.children ?? label,
  );
}

export function DocsPageFeedbackStatus(
  props: DocsPageFeedbackPartProps,
): ReactNode {
  const context = useDocsPageFeedbackContext();
  const labels = context.config.labels ?? defaultLabels;

  if (context.status === 'idle') {
    return null;
  }

  const message =
    context.status === 'submitting'
      ? (labels.feedbackSubmitting ?? defaultLabels.feedbackSubmitting)
      : context.status === 'submitted'
        ? (labels.feedbackSubmitted ?? defaultLabels.feedbackSubmitted)
        : (labels.feedbackError ?? defaultLabels.feedbackError);

  return createElement(
    Text,
    {
      role: context.status === 'error' ? 'alert' : 'status',
      ...mergeSlotStyleProps(context.styles.status, props.slotProps),
    },
    props.children ?? message,
  );
}

export const DocsPageFeedback = {
  Root: DocsPageFeedbackRoot,
  Prompt: DocsPageFeedbackPrompt,
  Choices: DocsPageFeedbackChoices,
  Option: DocsPageFeedbackOption,
  Comment: DocsPageFeedbackComment,
  Actions: DocsPageFeedbackActions,
  Submit: DocsPageFeedbackSubmit,
  Status: DocsPageFeedbackStatus,
} as const;

export function DocsCardsRoot(props: DocsCardsRootProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.cards,
    chakraDocsCardsSlotRecipe,
  );
  const styles = recipe();

  return createElement(
    Box,
    mergeSlotStyleProps(styles.root, props.slotProps),
    props.children,
  );
}

export function DocsCard(props: DocsCardProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.cards,
    chakraDocsCardsSlotRecipe,
  );
  const styles = recipe();
  const content = createElement(
    Fragment,
    null,
    props.icon
      ? createElement(
          Box,
          mergeSlotStyleProps(styles.icon, props.iconSlotProps),
          props.icon,
        )
      : null,
    createElement(
      Box,
      mergeSlotStyleProps(styles.content, props.contentSlotProps),
      createElement(
        Box,
        mergeSlotStyleProps(styles.title, props.titleSlotProps),
        props.title,
        props.badge
          ? createElement(
              Box,
              {
                as: 'span',
                ...mergeSlotStyleProps(styles.badge, props.badgeSlotProps),
              },
              props.badge,
            )
          : null,
      ),
      props.description
        ? createElement(
            Text,
            mergeSlotStyleProps(styles.description, props.descriptionSlotProps),
            props.description,
          )
        : null,
      props.children,
    ),
  );
  const cardProps = mergeSlotStyleProps(styles.card, props.slotProps);

  return props.href && isSafeLinkHref(props.href)
    ? createElement(DocsLink, { href: props.href, ...cardProps }, content)
    : createElement(Box, cardProps, content);
}

export const DocsCards = {
  Root: DocsCardsRoot,
  Card: DocsCard,
} as const;

export function DocsStepsRoot(props: DocsStepsRootProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.steps,
    chakraDocsStepsSlotRecipe,
  );
  const styles = recipe();

  return createElement(
    Box,
    { as: 'ol', ...mergeSlotStyleProps(styles.root, props.slotProps) },
    props.children,
  );
}

export function DocsStep(props: DocsStepProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.steps,
    chakraDocsStepsSlotRecipe,
  );
  const styles = recipe({ customIndicator: props.indicator !== undefined });

  return createElement(
    Box,
    { as: 'li', ...mergeSlotStyleProps(styles.item, props.slotProps) },
    createElement(
      Box,
      {
        as: 'span',
        'aria-hidden': 'true',
        ...mergeSlotStyleProps(styles.indicator, props.indicatorSlotProps),
      },
      props.indicator,
    ),
    createElement(
      Box,
      mergeSlotStyleProps(styles.content, props.contentSlotProps),
      props.title
        ? createElement(
            Box,
            mergeSlotStyleProps(styles.title, props.titleSlotProps),
            props.title,
          )
        : null,
      props.description
        ? createElement(
            Text,
            mergeSlotStyleProps(styles.description, props.descriptionSlotProps),
            props.description,
          )
        : null,
      props.children,
    ),
  );
}

export const DocsSteps = {
  Root: DocsStepsRoot,
  Item: DocsStep,
} as const;

interface DocsTabsContextValue {
  recipe: (props?: Record<string, unknown>) => Record<string, unknown>;
  styles: Record<string, unknown>;
  value: string;
}

const DocsTabsContext = createContext<DocsTabsContextValue | undefined>(
  undefined,
);

function useDocsTabsContext(): DocsTabsContextValue {
  const context = useContext(DocsTabsContext);

  if (!context) {
    throw new Error(
      'DocsTabs components must be rendered inside DocsTabs.Root.',
    );
  }

  return context;
}

export function DocsTabsRoot(props: DocsTabsRootProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.tabs,
    chakraDocsTabsSlotRecipe,
  );
  const styles = recipe();
  const controlled = props.value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(
    props.defaultValue ?? '',
  );
  const value = props.value ?? uncontrolledValue;
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(props.onValueChange);
  valueRef.current = value;
  onValueChangeRef.current = props.onValueChange;

  useEffect(() => {
    if (!props.syncKey) {
      return;
    }

    const syncKey = props.syncKey;
    const receiveValue = (nextValue: string) => {
      if (nextValue === valueRef.current) {
        return;
      }

      valueRef.current = nextValue;
      if (!controlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChangeRef.current?.(nextValue);
    };
    const unsubscribe = subscribeDocsTabsSyncValue(syncKey, receiveValue);
    const syncedValue = getDocsTabsSyncValue(syncKey);

    if (syncedValue !== undefined && syncedValue !== valueRef.current) {
      receiveValue(syncedValue);
    }

    return unsubscribe;
  }, [controlled, props.syncKey]);

  const select = (nextValue: string) => {
    if (nextValue === value) {
      return;
    }

    if (!controlled) {
      setUncontrolledValue(nextValue);
    }
    valueRef.current = nextValue;
    props.onValueChange?.(nextValue);

    if (props.syncKey) {
      publishDocsTabsSyncValue(props.syncKey, nextValue);
    }
  };

  return createElement(
    DocsTabsContext.Provider,
    { value: { recipe, styles, value } },
    createElement(
      Tabs.Root,
      {
        ...mergeSlotStyleProps(styles.root, props.slotProps),
        unstyled: true,
        value,
        onValueChange: (details: { value: string }) => select(details.value),
      },
      props.children,
    ),
  );
}

export function DocsTabsList(props: DocsTabsPartProps): ReactNode {
  const context = useDocsTabsContext();

  return createElement(
    Tabs.List,
    {
      ...mergeSlotStyleProps(context.styles.list, props.slotProps),
    },
    props.children,
  );
}

export function DocsTabsTrigger(props: DocsTabsValuePartProps): ReactNode {
  const context = useDocsTabsContext();
  const selected = context.value === props.value;
  const styles = context.recipe({ selected });

  return createElement(
    Tabs.Trigger,
    {
      ...mergeSlotStyleProps(styles.trigger, props.slotProps),
      value: props.value,
    },
    props.children,
  );
}

export function DocsTabsContent(props: DocsTabsValuePartProps): ReactNode {
  const context = useDocsTabsContext();

  return createElement(
    Tabs.Content,
    {
      ...mergeSlotStyleProps(context.styles.content, props.slotProps),
      value: props.value,
    },
    props.children,
  );
}

export const DocsTabs = {
  Root: DocsTabsRoot,
  List: DocsTabsList,
  Trigger: DocsTabsTrigger,
  Content: DocsTabsContent,
} as const;

export function DocsApiTable(props: DocsApiTableProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.apiTable,
    chakraDocsApiTableSlotRecipe,
  );
  const styles = recipe();
  const headers = [
    props.nameLabel ?? 'Name',
    props.typeLabel ?? 'Type',
    props.defaultLabel ?? 'Default',
    props.descriptionLabel ?? 'Description',
  ];

  return createElement(
    Box,
    mergeSlotStyleProps(styles.root, props.slotProps),
    createElement(
      Box,
      {
        as: 'table',
        ...mergeSlotStyleProps(styles.table, props.tableSlotProps),
      },
      props.caption
        ? createElement(
            Box,
            {
              as: 'caption',
              ...mergeSlotStyleProps(styles.caption, props.captionSlotProps),
            },
            props.caption,
          )
        : null,
      createElement(
        Box,
        {
          as: 'thead',
          ...mergeSlotStyleProps(styles.header, props.headerSlotProps),
        },
        createElement(
          Box,
          { as: 'tr', ...mergeSlotStyleProps(styles.row, props.rowSlotProps) },
          headers.map((header) =>
            createElement(
              Box,
              {
                as: 'th',
                key: header,
                scope: 'col',
                ...mergeSlotStyleProps(
                  styles.columnHeader,
                  props.columnHeaderSlotProps,
                ),
              },
              header,
            ),
          ),
        ),
      ),
      createElement(
        Box,
        { as: 'tbody' },
        props.items.map((item) =>
          createElement(
            Box,
            {
              as: 'tr',
              key: item.name,
              ...mergeSlotStyleProps(styles.row, props.rowSlotProps),
            },
            createElement(
              Box,
              {
                as: 'td',
                ...mergeSlotStyleProps(styles.cell, props.cellSlotProps),
              },
              createElement(
                Code,
                mergeSlotStyleProps(styles.name, props.nameSlotProps),
                item.name,
              ),
              item.required
                ? createElement(
                    DocsBadge,
                    {
                      slotProps: mergeSlotStyleProps(
                        styles.required,
                        props.requiredSlotProps,
                      ),
                    },
                    props.requiredLabel ?? 'Required',
                  )
                : null,
            ),
            createElement(
              Box,
              {
                as: 'td',
                ...mergeSlotStyleProps(styles.cell, props.cellSlotProps),
              },
              item.type !== undefined
                ? createElement(
                    Code,
                    mergeSlotStyleProps(styles.type, props.typeSlotProps),
                    item.type,
                  )
                : '—',
            ),
            createElement(
              Box,
              {
                as: 'td',
                ...mergeSlotStyleProps(styles.cell, props.cellSlotProps),
              },
              item.defaultValue !== undefined
                ? createElement(
                    Code,
                    mergeSlotStyleProps(
                      styles.defaultValue,
                      props.defaultValueSlotProps,
                    ),
                    item.defaultValue,
                  )
                : '—',
            ),
            createElement(
              Box,
              {
                as: 'td',
                ...mergeSlotStyleProps(
                  [styles.cell, styles.description],
                  props.descriptionSlotProps,
                ),
              },
              item.description,
            ),
          ),
        ),
      ),
    ),
  );
}

export function DocsBadge(props: DocsBadgeProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.badge,
    chakraDocsBadgeSlotRecipe,
  );
  const styles = recipe({ tone: props.tone ?? 'neutral' });

  return createElement(
    Badge,
    {
      colorPalette: props.colorPalette,
      ...mergeSlotStyleProps(styles.root, props.slotProps),
    },
    props.children,
  );
}

export function DocsSidebar(props: DocsSidebarProps): ReactNode {
  const config = useDocsConfig();
  const stickyTop = props.stickyTop ??
    config.layout?.sidebarStickyTop ??
    config.layout?.stickyTop ?? { lg: 8 };
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.sidebar,
    chakraDocsSidebarSlotRecipe,
  );
  const styles = recipe();
  const nav = props.nav ?? [];
  const activeRoute = props.page?.route;
  const controlled = props.expandedIds !== undefined;
  const [uncontrolledExpandedIds, setUncontrolledExpandedIds] = useState(() =>
    resolveSidebarDefaultExpandedIds(nav, activeRoute, props.defaultExpanded),
  );
  const expandedIds = normalizeSidebarExpandedIds(
    nav,
    props.expandedIds ?? uncontrolledExpandedIds,
  );
  const expandedIdsRef = useRef(expandedIds);
  const navRef = useRef(nav);
  const onExpandedChangeRef = useRef(props.onExpandedChange);
  const mountedRef = useRef(false);
  expandedIdsRef.current = expandedIds;
  navRef.current = nav;
  onExpandedChangeRef.current = props.onExpandedChange;
  const activeBranchKey = getActiveSidebarBranchIds(nav, activeRoute).join(
    '\0',
  );
  const branchKey = getSidebarBranchIds(nav).join('\0');

  useEffect(() => {
    if (!props.collapsible) {
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const nextExpandedIds = mergeActiveSidebarBranchIds(
      navRef.current,
      activeRoute,
      expandedIdsRef.current,
    );

    if (sidebarExpandedIdsEqual(expandedIdsRef.current, nextExpandedIds)) {
      return;
    }

    if (!controlled) {
      setUncontrolledExpandedIds(nextExpandedIds);
    }
    onExpandedChangeRef.current?.(nextExpandedIds);
  }, [activeBranchKey, activeRoute, branchKey, controlled, props.collapsible]);

  const toggleExpanded = (id: string) => {
    const nextExpandedIds = toggleSidebarExpandedId(
      nav,
      expandedIdsRef.current,
      id,
    );

    if (!controlled) {
      setUncontrolledExpandedIds(nextExpandedIds);
    }
    props.onExpandedChange?.(nextExpandedIds);
  };
  const contentIdPrefix = useId();

  return createElement(
    Box,
    {
      as: 'nav',
      top: stickyTop,
      ...mergeSlotStyleProps(styles.root, props.slotProps),
    },
    props.children,
    createElement(NavList, {
      items: nav,
      activeRoute,
      badgeSlotProps: props.badgeSlotProps,
      collapsible: props.collapsible ?? false,
      contentIdPrefix,
      contentSlotProps: props.contentSlotProps,
      childrenSlotProps: props.childrenSlotProps,
      expandedIds: new Set(expandedIds),
      indicatorSlotProps: props.indicatorSlotProps,
      itemSlotProps: props.itemSlotProps,
      linkSlotProps: props.linkSlotProps,
      listSlotProps: props.listSlotProps,
      recipe,
      sectionTitleSlotProps: props.sectionTitleSlotProps,
      toggleExpanded,
      triggerSlotProps: props.triggerSlotProps,
    }),
  );
}

interface DocsMobileNavigationContextValue {
  closeOnNavigate: boolean;
  config: ChakraDocsConfig;
  nav: DocsNavItem[];
  page?: DocsPage;
  search?: ReactNode;
  sidebarContent?: ReactNode;
  sidebarProps?: Omit<DocsSidebarProps, 'nav' | 'page'>;
  styles: Record<string, unknown>;
  title?: ReactNode;
}

const DocsMobileNavigationContext = createContext<
  DocsMobileNavigationContextValue | undefined
>(undefined);

function useDocsMobileNavigationContext(): DocsMobileNavigationContextValue {
  const context = useContext(DocsMobileNavigationContext);

  if (!context) {
    throw new Error(
      'DocsMobileNavigation components must be rendered inside DocsMobileNavigation.Root.',
    );
  }

  return context;
}

export function DocsMobileNavigationRoot(
  props: DocsMobileNavigationRootProps,
): ReactNode {
  const config = useDocsConfig();
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.mobileNavigation,
    chakraDocsMobileNavigationSlotRecipe,
  );
  const styles = recipe();
  const context: DocsMobileNavigationContextValue = {
    closeOnNavigate: props.closeOnNavigate ?? true,
    config,
    nav: props.nav ?? [],
    page: props.page,
    search: props.search,
    sidebarContent: props.sidebarContent,
    sidebarProps: props.sidebarProps,
    styles,
    title: props.title,
  };
  const children =
    props.children ??
    createElement(
      Fragment,
      null,
      createElement(DocsMobileNavigationTrigger),
      createElement(DocsMobileNavigationContent),
    );

  return createElement(
    Dialog.Root,
    {
      defaultOpen: props.defaultOpen,
      lazyMount: true,
      motionPreset: 'slide-in-left',
      onOpenChange: props.onOpenChange,
      open: props.open,
      // Preserve uncontrolled sidebar expansion after the first opening.
      unmountOnExit: false,
    },
    createElement(
      DocsMobileNavigationContext.Provider,
      { value: context },
      createElement(
        Box,
        mergeSlotStyleProps(styles.root, props.slotProps),
        children,
      ),
    ),
  );
}

export function DocsMobileNavigationTrigger(
  props: DocsMobileNavigationTriggerProps,
): ReactNode {
  const context = useDocsMobileNavigationContext();
  const labels = context.config.labels ?? defaultLabels;
  const content =
    props.children ??
    createElement(
      Fragment,
      null,
      createElement(
        Box,
        {
          as: 'span',
          'aria-hidden': 'true',
          ...mergeSlotStyleProps(
            context.styles.triggerIcon,
            props.iconSlotProps,
          ),
        },
        props.icon ?? '☰',
      ),
      createElement(
        Box,
        {
          as: 'span',
          ...mergeSlotStyleProps(
            context.styles.triggerLabel,
            props.labelSlotProps,
          ),
        },
        props.label ?? labels.navigationMenu ?? defaultLabels.navigationMenu,
      ),
    );

  return createElement(
    Dialog.Trigger,
    { asChild: true },
    createElement(
      Button,
      {
        type: 'button',
        'aria-label':
          props.ariaLabel ??
          labels.openNavigation ??
          defaultLabels.openNavigation,
        ...mergeSlotStyleProps(context.styles.trigger, props.slotProps),
      },
      content,
    ),
  );
}

export function DocsMobileNavigationContent(
  props: DocsMobileNavigationContentProps,
): ReactNode {
  const context = useDocsMobileNavigationContext();
  const children =
    props.children ??
    createElement(
      Fragment,
      null,
      createElement(DocsMobileNavigationHeader),
      context.search ? createElement(DocsMobileNavigationSearch) : null,
      createElement(DocsMobileNavigationBody),
    );

  return createElement(
    Portal,
    null,
    createElement(
      Dialog.Backdrop,
      mergeSlotStyleProps(context.styles.backdrop, props.backdropSlotProps),
    ),
    createElement(
      Dialog.Positioner,
      mergeSlotStyleProps(context.styles.positioner, props.positionerSlotProps),
      createElement(
        Dialog.Content,
        mergeSlotStyleProps(context.styles.content, props.slotProps),
        children,
      ),
    ),
  );
}

export function DocsMobileNavigationHeader(
  props: DocsMobileNavigationPartProps,
): ReactNode {
  const context = useDocsMobileNavigationContext();

  return createElement(
    Dialog.Header,
    mergeSlotStyleProps(context.styles.header, props.slotProps),
    props.children ??
      createElement(
        Fragment,
        null,
        createElement(DocsMobileNavigationTitle),
        createElement(DocsMobileNavigationCloseTrigger),
      ),
  );
}

export function DocsMobileNavigationTitle(
  props: DocsMobileNavigationPartProps,
): ReactNode {
  const context = useDocsMobileNavigationContext();
  const labels = context.config.labels ?? defaultLabels;

  return createElement(
    Dialog.Title,
    mergeSlotStyleProps(context.styles.title, props.slotProps),
    props.children ??
      context.title ??
      labels.navigationTitle ??
      defaultLabels.navigationTitle,
  );
}

export function DocsMobileNavigationCloseTrigger(
  props: DocsMobileNavigationCloseTriggerProps,
): ReactNode {
  const context = useDocsMobileNavigationContext();
  const labels = context.config.labels ?? defaultLabels;

  return createElement(
    Dialog.CloseTrigger,
    { asChild: true },
    createElement(
      Button,
      {
        type: 'button',
        'aria-label':
          props.ariaLabel ??
          labels.closeNavigation ??
          defaultLabels.closeNavigation,
        ...mergeSlotStyleProps(context.styles.closeTrigger, props.slotProps),
      },
      props.children ?? '×',
    ),
  );
}

export function DocsMobileNavigationSearch(
  props: DocsMobileNavigationPartProps,
): ReactNode {
  const context = useDocsMobileNavigationContext();
  const children = props.children ?? context.search;

  if (!children) {
    return null;
  }

  return createElement(
    Box,
    mergeSlotStyleProps(context.styles.search, props.slotProps),
    children,
  );
}

export function DocsMobileNavigationBody(
  props: DocsMobileNavigationPartProps,
): ReactNode {
  const context = useDocsMobileNavigationContext();

  return createElement(
    Dialog.Body,
    mergeSlotStyleProps(context.styles.body, props.slotProps),
    props.children ?? createElement(DocsMobileNavigationSidebar),
  );
}

interface DocsMobileNavigationClickEvent {
  defaultPrevented?: boolean;
}

function DocsMobileNavigationRouteEffect(props: {
  closeOnNavigate: boolean;
  open: boolean;
  route?: string;
  setOpen: (open: boolean) => void;
}): null {
  const previousRouteRef = useRef(props.route);

  useEffect(() => {
    if (
      props.closeOnNavigate &&
      props.open &&
      previousRouteRef.current !== undefined &&
      previousRouteRef.current !== props.route
    ) {
      props.setOpen(false);
    }

    previousRouteRef.current = props.route;
  }, [props.closeOnNavigate, props.open, props.route, props.setOpen]);

  return null;
}

export function DocsMobileNavigationSidebar(
  props: DocsMobileNavigationSidebarProps,
): ReactNode {
  const context = useDocsMobileNavigationContext();
  const configuredProps = context.sidebarProps ?? {};

  return createElement(Dialog.Context, {
    children: ({
      open,
      setOpen,
    }: {
      open: boolean;
      setOpen: (open: boolean) => void;
    }) => {
      const linkSlotProps = mergeComponentSlotProps(
        undefined,
        configuredProps.linkSlotProps,
        props.linkSlotProps,
      );
      const onClick = linkSlotProps.onClick;

      return createElement(
        Fragment,
        null,
        createElement(DocsMobileNavigationRouteEffect, {
          closeOnNavigate: context.closeOnNavigate,
          open,
          route: context.page?.route,
          setOpen,
        }),
        createElement(
          DocsSidebar,
          {
            ...configuredProps,
            ...props,
            collapsible:
              props.collapsible ?? configuredProps.collapsible ?? true,
            defaultExpanded:
              props.defaultExpanded ??
              configuredProps.defaultExpanded ??
              'active',
            nav: context.nav,
            page: context.page,
            linkSlotProps: {
              ...linkSlotProps,
              onClick: (event: DocsMobileNavigationClickEvent) => {
                if (typeof onClick === 'function') {
                  (onClick as (event: DocsMobileNavigationClickEvent) => void)(
                    event,
                  );
                }

                if (!event.defaultPrevented && context.closeOnNavigate) {
                  setOpen(false);
                }
              },
            },
            slotProps: mergeComponentSlotProps(
              context.styles.sidebar,
              configuredProps.slotProps,
              props.slotProps,
            ),
          },
          props.children ?? configuredProps.children ?? context.sidebarContent,
        ),
      );
    },
  });
}

export const DocsMobileNavigation = {
  Root: DocsMobileNavigationRoot,
  Trigger: DocsMobileNavigationTrigger,
  Content: DocsMobileNavigationContent,
  Header: DocsMobileNavigationHeader,
  Title: DocsMobileNavigationTitle,
  CloseTrigger: DocsMobileNavigationCloseTrigger,
  Search: DocsMobileNavigationSearch,
  Body: DocsMobileNavigationBody,
  Sidebar: DocsMobileNavigationSidebar,
} as const;

export function DocsTableOfContents(
  props: DocsTableOfContentsProps,
): ReactNode {
  const config = useDocsConfig();
  const labels = config.labels ?? defaultLabels;
  const headings = props.headings ?? [];
  const stickyTop =
    props.stickyTop ??
    config.layout?.tocStickyTop ??
    config.layout?.stickyTop ??
    8;
  const scrollMarginTop =
    props.scrollMarginTop ??
    props.stickyTop ??
    config.layout?.scrollMarginTop ??
    config.layout?.stickyTop ??
    8;
  const [activeHeadingId, setActiveHeadingId] = useActiveTocHeading(
    headings,
    scrollMarginTop,
  );
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.tableOfContents,
    chakraDocsTableOfContentsSlotRecipe,
  );
  const styles = recipe();

  if (headings.length === 0) {
    return null;
  }

  return createElement(
    Box,
    {
      as: 'aside',
      top: stickyTop,
      ...mergeSlotStyleProps(styles.root, props.slotProps),
    },
    createElement(
      Text,
      mergeSlotStyleProps(styles.label, props.labelSlotProps),
      labels.onThisPage,
    ),
    createElement(
      Box,
      {
        as: 'ol',
        ...mergeSlotStyleProps(styles.list, props.listSlotProps),
      },
      headings.map((heading) => {
        const active = activeHeadingId === heading.id;
        const itemStyles = recipe({ active });

        return createElement(
          Box,
          {
            as: 'li',
            key: heading.id,
            ps: Math.max(0, heading.level - 2) * 3,
            ...mergeSlotStyleProps(itemStyles.item, props.itemSlotProps),
          },
          createElement(
            Link,
            {
              'aria-current': active ? 'location' : undefined,
              href: `#${heading.id}`,
              onClick: (event: DocsAnchorClickEvent) => {
                if (!shouldHandleTocClick(event)) {
                  return;
                }

                event.preventDefault();
                setActiveHeadingId(heading.id);
                scrollToHeading(heading.id, scrollMarginTop);
              },
              ...mergeSlotStyleProps(itemStyles.link, props.linkSlotProps),
            },
            createElement(Box, {
              as: 'span',
              'aria-hidden': 'true',
              ...mergeSlotStyleProps(
                itemStyles.activeIndicator,
                props.activeIndicatorSlotProps,
              ),
            }),
            heading.title,
          ),
        );
      }),
    ),
  );
}

export function DocsMobileTableOfContents(
  props: DocsMobileTableOfContentsProps,
): ReactNode {
  const config = useDocsConfig();
  const labels = config.labels ?? defaultLabels;
  const headings = props.headings ?? [];
  const scrollMarginTop =
    props.scrollMarginTop ??
    props.stickyTop ??
    config.layout?.scrollMarginTop ??
    config.layout?.stickyTop ??
    8;
  const [activeHeadingId, setActiveHeadingId] = useActiveTocHeading(
    headings,
    scrollMarginTop,
  );
  const activeHeading = headings.find(
    (heading) => heading.id === activeHeadingId,
  );
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.mobileTableOfContents,
    chakraDocsMobileTableOfContentsSlotRecipe,
  );
  const styles = recipe();

  if (headings.length === 0) {
    return null;
  }

  return createElement(
    Box,
    {
      as: 'details',
      ...mergeSlotStyleProps(styles.root, props.slotProps),
    },
    createElement(
      Box,
      {
        as: 'summary',
        ...mergeSlotStyleProps(styles.trigger, props.triggerSlotProps),
      },
      createElement(
        Box,
        {
          as: 'span',
          ...mergeSlotStyleProps(
            styles.triggerLabel,
            props.triggerLabelSlotProps,
          ),
        },
        labels.onThisPage ?? defaultLabels.onThisPage,
      ),
      activeHeading
        ? createElement(
            Box,
            {
              as: 'span',
              ...mergeSlotStyleProps(styles.current, props.currentSlotProps),
            },
            activeHeading.title,
          )
        : null,
      createElement(
        Box,
        {
          as: 'span',
          'aria-hidden': 'true',
          ...mergeSlotStyleProps(styles.indicator, props.indicatorSlotProps),
        },
        '⌄',
      ),
    ),
    createElement(
      Box,
      mergeSlotStyleProps(styles.content, props.contentSlotProps),
      createElement(
        Box,
        {
          as: 'ol',
          ...mergeSlotStyleProps(styles.list, props.listSlotProps),
        },
        headings.map((heading) => {
          const active = activeHeadingId === heading.id;
          const itemStyles = recipe({ active });

          return createElement(
            Box,
            {
              as: 'li',
              key: heading.id,
              ps: Math.max(0, heading.level - 2) * 3,
              ...mergeSlotStyleProps(itemStyles.item, props.itemSlotProps),
            },
            createElement(
              Link,
              {
                'aria-current': active ? 'location' : undefined,
                href: `#${heading.id}`,
                onClick: (event: DocsAnchorClickEvent) => {
                  if (!shouldHandleTocClick(event)) {
                    return;
                  }

                  event.preventDefault();
                  setActiveHeadingId(heading.id);
                  scrollToHeading(heading.id, scrollMarginTop);
                },
                ...mergeSlotStyleProps(itemStyles.link, props.linkSlotProps),
              },
              createElement(Box, {
                as: 'span',
                'aria-hidden': 'true',
                ...mergeSlotStyleProps(
                  itemStyles.activeIndicator,
                  props.activeIndicatorSlotProps,
                ),
              }),
              heading.title,
            ),
          );
        }),
      ),
    ),
  );
}

function useActiveTocHeading(
  headings: readonly DocsHeading[],
  scrollMarginTop: ChakraDocsStickyTop,
): [string | undefined, (headingId: string | undefined) => void] {
  const headingIds = useMemo(
    () => headings.map((heading) => heading.id).filter(Boolean),
    [headings],
  );
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>();

  useEffect(() => {
    return observeActiveHeading({
      headingIds,
      scrollMarginTop,
      onChange: setActiveHeadingId,
    });
  }, [headingIds, scrollMarginTop]);

  return [activeHeadingId, setActiveHeadingId];
}

function observeActiveHeading(props: {
  headingIds: string[];
  scrollMarginTop: ChakraDocsStickyTop;
  onChange: (headingId: string | undefined) => void;
}): () => void {
  const env = getBrowserEnv();

  if (!env || props.headingIds.length === 0) {
    props.onChange(undefined);
    return () => undefined;
  }

  const browserEnv = env;
  let frame: number | undefined;

  function update() {
    frame = undefined;
    props.onChange(
      getActiveHeadingId(browserEnv, props.headingIds, props.scrollMarginTop),
    );
  }

  function scheduleUpdate() {
    if (frame !== undefined) {
      return;
    }

    if (!browserEnv.window.requestAnimationFrame) {
      update();
      return;
    }

    frame = browserEnv.window.requestAnimationFrame(update);
  }

  update();
  browserEnv.window.addEventListener?.('scroll', scheduleUpdate, {
    passive: true,
  });
  browserEnv.window.addEventListener?.('resize', scheduleUpdate);

  return () => {
    if (frame !== undefined) {
      browserEnv.window.cancelAnimationFrame?.(frame);
    }

    browserEnv.window.removeEventListener?.('scroll', scheduleUpdate);
    browserEnv.window.removeEventListener?.('resize', scheduleUpdate);
  };
}

function shouldHandleTocClick(event: DocsAnchorClickEvent): boolean {
  return (
    !event.defaultPrevented &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.button === undefined || event.button === 0)
  );
}

function scrollToHeading(
  headingId: string,
  scrollMarginTop: ChakraDocsStickyTop,
): boolean {
  const env = getBrowserEnv();
  const element = env?.document.getElementById?.(headingId);

  if (!env || !element) {
    return false;
  }

  const behavior = getScrollBehavior(env.window);
  const rect = element.getBoundingClientRect?.();

  updateLocationHash(env.window, headingId);

  if (!rect || !env.window.scrollTo) {
    element.scrollIntoView?.({ behavior, block: 'start' });
    return true;
  }

  const top = Math.max(
    0,
    rect.top +
      getScrollY(env) -
      getHeadingScrollOffset(element, scrollMarginTop, env.window),
  );

  env.window.scrollTo({ behavior, top });
  return true;
}

function getBrowserEnv(): DocsBrowserEnv | undefined {
  const root = globalThis as unknown as DocsBrowserWindow;
  const win = root.window ?? root;
  const doc = win.document ?? root.document;

  return doc ? { document: doc, window: win } : undefined;
}

function getScrollY(env: DocsBrowserEnv): number {
  return (
    env.window.scrollY ??
    env.window.pageYOffset ??
    env.document.documentElement?.scrollTop ??
    env.document.body?.scrollTop ??
    0
  );
}

function getScrollBehavior(win: DocsBrowserWindow): DocsScrollBehavior {
  return win.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
}

function updateLocationHash(win: DocsBrowserWindow, headingId: string) {
  const hash = `#${encodeURIComponent(headingId)}`;

  if (!win.history?.pushState || win.location?.hash === hash) {
    return;
  }

  win.history.pushState(
    null,
    '',
    `${win.location?.pathname ?? ''}${win.location?.search ?? ''}${hash}`,
  );
}

export function DocsSearch(props: DocsSearchProps): ReactNode {
  const config = useDocsConfig();
  const labels = config.labels ?? defaultLabels;
  const inputRef = useRef<{ focus: () => void } | null>(null);
  const returnFocusRef = useRef<{
    focus: () => void;
    isConnected: boolean;
  } | null>(null);
  const searchId = useId();
  const resultsId = `${searchId}-results`;
  const resultsLabelId = `${searchId}-results-label`;
  const resultsRef = useRef<{
    scrollTop: number;
    clientTop: number;
    clientHeight: number;
    getBoundingClientRect: () => { top: number };
    querySelector: (selector: string) => {
      getBoundingClientRect: () => { top: number; bottom: number };
    } | null;
  } | null>(null);
  const remoteRequesterRef = useRef<ReturnType<
    typeof createRemoteSearchRequester
  > | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteSearch, setRemoteSearch] = useState<RemoteSearchState>({
    results: [],
    status: 'idle',
  });
  const isRemote = props.searchProvider !== undefined;
  const normalizedQuery = query.trim().toLowerCase();
  const records = props.records ?? emptySearchRecords;
  const collectionIds = useMemo(
    () => resolveSearchCollectionIds(props),
    [props.collectionId, props.collectionIds],
  );
  const defaultResults = useMemo(
    () =>
      getDefaultSearchResults(
        props.defaultResults,
        collectionIds,
        props.popularLimit,
      ),
    [props.defaultResults, collectionIds, props.popularLimit],
  );
  const showDefaultResults =
    !normalizedQuery && props.defaultResults !== undefined;
  const searchAvailable =
    isRemote || records.length > 0 || defaultResults.length > 0;
  const searchQuery = useMemo<DocsSearchQuery>(
    () => ({
      collectionIds,
      limit: props.limit,
      popularLimit: props.popularLimit,
      query: query.trim(),
    }),
    [collectionIds, props.limit, props.popularLimit, query],
  );
  const searchEngine = useMemo(
    () => (isRemote ? undefined : createDocsSearchEngine(records)),
    [isRemote, records],
  );
  const localResults = useMemo(
    () => searchEngine?.search(searchQuery).results ?? [],
    [searchEngine, searchQuery],
  );
  const results = showDefaultResults
    ? defaultResults
    : isRemote
      ? remoteSearch.results
      : localResults;
  const resultsUnavailable =
    isRemote &&
    !showDefaultResults &&
    (remoteSearch.status === 'loading' || remoteSearch.status === 'error');
  const selectedIndex = Math.min(activeIndex, results.length - 1);
  const activeResultId =
    open && !resultsUnavailable && selectedIndex >= 0
      ? `${searchId}-result-${selectedIndex}`
      : undefined;
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.search,
    chakraDocsSearchSlotRecipe,
  );
  const styles = recipe();

  if (!remoteRequesterRef.current) {
    remoteRequesterRef.current = createRemoteSearchRequester(setRemoteSearch);
  }

  useEffect(() => {
    const requester = remoteRequesterRef.current;

    if (!requester || !open || !props.searchProvider || showDefaultResults) {
      requester?.cancel();
      return;
    }

    // Popular results are useful immediately when the dialog opens. Typed
    // queries wait for the debounce interval to avoid unnecessary requests.
    const delayMs = getRemoteSearchDelayMs(searchQuery.query, props.debounceMs);

    requester.request(props.searchProvider, searchQuery, delayMs);
    return () => requester.cancel();
  }, [
    normalizedQuery,
    open,
    props.debounceMs,
    props.searchProvider,
    searchQuery,
    showDefaultResults,
  ]);

  useEffect(() => {
    const target = globalThis as unknown as {
      addEventListener?: (
        type: string,
        listener: (event: DocsKeyboardEvent) => void,
      ) => void;
      removeEventListener?: (
        type: string,
        listener: (event: DocsKeyboardEvent) => void,
      ) => void;
    };

    function onKeyDown(event: DocsKeyboardEvent) {
      const isSearchShortcut =
        event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);

      if (
        !isSearchShortcut ||
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      if (!searchAvailable) {
        return;
      }

      event.preventDefault();
      const document = (
        globalThis as unknown as {
          document?: { activeElement: typeof returnFocusRef.current };
        }
      ).document;
      if (!open) returnFocusRef.current = document?.activeElement ?? null;
      setOpen(true);
      config.analytics?.onSearchOpen?.();
    }

    target.addEventListener?.('keydown', onKeyDown);
    return () => target.removeEventListener?.('keydown', onKeyDown);
  }, [config.analytics, open, searchAvailable]);

  useEffect(() => {
    setActiveIndex(0);
  }, [open, results]);

  useEffect(() => {
    const scroller = resultsRef.current;
    if (!activeResultId || !scroller) return;
    const row = scroller.querySelector(
      `[data-search-result-index="${selectedIndex}"]`,
    );
    if (!row) return;

    // Scroll only the results pane, not the dialog or the host document. Keep
    // the whole row visible without smooth-scroll lag during key repeat.
    const top = scroller.getBoundingClientRect().top + scroller.clientTop;
    const bottom = top + scroller.clientHeight;
    const bounds = row.getBoundingClientRect();
    if (bounds.top < top) {
      scroller.scrollTop += bounds.top - top;
    } else if (bounds.bottom > bottom) {
      scroller.scrollTop += Math.min(bounds.bottom - bottom, bounds.top - top);
    }
  }, [activeResultId, results, selectedIndex]);

  useEffect(() => {
    if (normalizedQuery) {
      config.analytics?.onSearch?.(normalizedQuery);
    }
  }, [config.analytics, normalizedQuery]);

  function closeSearch() {
    setOpen(false);
    setQuery('');
  }

  function selectResult(record: DocsSearchResult) {
    props.onResultSelect?.(record);
    config.analytics?.onSearchResultSelect?.(record);
    closeSearch();
  }

  function navigateToLocation(href: string) {
    if (!isSafeDocsRoute(href)) {
      return;
    }

    const location = globalThis as unknown as {
      location?: { assign?: (href: string) => void; href?: string };
    };

    if (location.location?.assign) {
      location.location.assign(href);
    } else if (location.location) {
      location.location.href = href;
    }
  }

  function activateResult(
    record: DocsSearchResult,
    event?: DocsAnchorClickEvent,
  ) {
    activateSearchResult(record, {
      event,
      navigate: navigateToLocation,
      onNavigate: props.onNavigate,
      onSelect: selectResult,
    });
  }

  function onInputKeyDown(event: DocsKeyboardEvent) {
    if (
      resultsUnavailable ||
      results.length === 0 ||
      event.defaultPrevented ||
      event.isComposing ||
      event.nativeEvent?.isComposing ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' && results[selectedIndex]) {
      event.preventDefault();
      activateResult(results[selectedIndex]);
    }
  }

  return createElement(
    Dialog.Root,
    {
      lazyMount: true,
      initialFocusEl: () => inputRef.current,
      finalFocusEl: () =>
        returnFocusRef.current?.isConnected
          ? returnFocusRef.current
          : undefined,
      onOpenChange: (details: { open: boolean }) => {
        setOpen(details.open);

        if (details.open) {
          returnFocusRef.current = null;
          config.analytics?.onSearchOpen?.();
        } else {
          setQuery('');
        }
      },
      open,
      placement: 'top',
      ...props.slotProps,
    },
    createElement(
      Dialog.Trigger,
      { asChild: true },
      createElement(
        Button,
        {
          disabled: !searchAvailable,
          size: 'sm',
          variant: 'outline',
          ...mergeSlotStyleProps(styles.trigger, props.triggerSlotProps),
        },
        createElement(
          Text,
          mergeSlotStyleProps(styles.triggerLabel, props.triggerLabelSlotProps),
          labels.search,
        ),
        createElement(
          Kbd,
          mergeSlotStyleProps(styles.shortcut, props.shortcutSlotProps),
          '⌘K',
        ),
      ),
    ),
    createElement(
      Portal,
      null,
      createElement(
        Dialog.Backdrop,
        mergeSlotStyleProps(styles.backdrop, props.backdropSlotProps),
      ),
      createElement(
        Dialog.Positioner,
        mergeSlotStyleProps(styles.positioner, props.positionerSlotProps),
        createElement(
          Dialog.Content,
          mergeSlotStyleProps(styles.root, props.contentSlotProps),
          createElement(
            Dialog.Header,
            mergeSlotStyleProps(styles.header, props.headerSlotProps),
            createElement(
              Dialog.Title,
              mergeSlotStyleProps(styles.title, props.titleSlotProps),
              labels.search,
            ),
          ),
          createElement(
            Dialog.Body,
            mergeSlotStyleProps(styles.body, props.bodySlotProps),
            createElement(Input, {
              ref: inputRef,
              'aria-label': labels.search,
              role: 'combobox',
              'aria-autocomplete': 'list',
              'aria-haspopup': 'listbox',
              'aria-expanded': open,
              'aria-controls': resultsId,
              'aria-activedescendant': activeResultId,
              autoComplete: 'off',
              onChange: (event: DocsInputChangeEvent) =>
                setQuery(event.currentTarget.value),
              onKeyDown: onInputKeyDown,
              placeholder: props.placeholder ?? labels.searchPlaceholder,
              value: query,
              ...mergeSlotStyleProps(styles.input, props.inputSlotProps),
            }),
            createElement(
              Box,
              {
                ...mergeSlotStyleProps(styles.results, props.resultsSlotProps),
                ref: resultsRef,
              },
              createElement(
                Text,
                {
                  ...mergeSlotStyleProps(
                    styles.sectionLabel,
                    props.sectionLabelSlotProps,
                  ),
                  id: resultsLabelId,
                },
                showDefaultResults
                  ? (props.defaultResultsLabel ?? 'Recommended')
                  : normalizedQuery
                    ? (labels.searchResults ?? defaultLabels.searchResults)
                    : (labels.searchPopular ?? defaultLabels.searchPopular),
              ),
              createElement(
                Stack,
                {
                  ...mergeSlotStyleProps(
                    styles.resultList,
                    props.resultListSlotProps,
                  ),
                  id: resultsId,
                  role: 'listbox',
                  'aria-labelledby': resultsLabelId,
                  'aria-busy':
                    isRemote &&
                    !showDefaultResults &&
                    remoteSearch.status === 'loading',
                },
                !resultsUnavailable
                  ? results.map((record, index) =>
                      createElement(SearchResult, {
                        active: index === selectedIndex,
                        id: `${searchId}-result-${index}`,
                        index,
                        key: record.id,
                        onActivate: () => setActiveIndex(index),
                        onSelect: (event: DocsAnchorClickEvent) =>
                          activateResult(record, event),
                        recipe,
                        record,
                        resultBadgeSlotProps: props.resultBadgeSlotProps,
                        resultContentSlotProps: props.resultContentSlotProps,
                        resultDescriptionSlotProps:
                          props.resultDescriptionSlotProps,
                        resultLinkSlotProps: props.resultLinkSlotProps,
                        resultRowSlotProps: props.resultRowSlotProps,
                        slotProps: props.resultSlotProps,
                        resultTitleSlotProps: props.resultTitleSlotProps,
                      }),
                    )
                  : null,
              ),
              isRemote &&
                !showDefaultResults &&
                remoteSearch.status === 'loading'
                ? createSearchStatus(
                    labels.searchLoading ?? defaultLabels.searchLoading,
                    'status',
                    styles.status,
                    props.statusSlotProps,
                  )
                : isRemote &&
                    !showDefaultResults &&
                    remoteSearch.status === 'error'
                  ? createSearchStatus(
                      labels.searchError ?? defaultLabels.searchError,
                      'alert',
                      styles.status,
                      props.statusSlotProps,
                    )
                  : results.length > 0
                    ? null
                    : createSearchStatus(
                        labels.searchNoResults ?? defaultLabels.searchNoResults,
                        'status',
                        styles.status,
                        props.statusSlotProps,
                      ),
            ),
          ),
        ),
      ),
    ),
  );
}

export function DocsVersionSelect(props: DocsVersionSelectProps): ReactNode {
  const labels = useDocsConfig().labels ?? defaultLabels;
  const selectId = useId();
  const allValue = props.allValue ?? '';
  const labelText =
    props.label ??
    labels.version ??
    defaultLabels.version ??
    labels.collection ??
    defaultLabels.collection;
  const allLabelText =
    props.allLabel ??
    labels.allVersions ??
    defaultLabels.allVersions ??
    labels.allCollections ??
    defaultLabels.allCollections;
  const options =
    props.options ??
    props.collections?.map((collection) => ({
      id: collection.id,
      label: collection.name ?? collection.id,
    })) ??
    [];
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.versionSelect,
    chakraDocsVersionSelectSlotRecipe,
  );
  const styles = recipe();
  const hiddenLabelProps = props.labelHidden
    ? {
        border: 0,
        clip: 'rect(0, 0, 0, 0)',
        h: '1px',
        m: '-1px',
        overflow: 'hidden',
        p: 0,
        position: 'absolute',
        whiteSpace: 'nowrap',
        w: '1px',
      }
    : {};
  const selectProps: Record<string, unknown> = {
    as: 'select',
    id: selectId,
    value: props.value,
    onChange: (event: DocsInputChangeEvent) =>
      props.onValueChange?.(event.currentTarget.value),
    ...mergeSlotStyleProps(styles.select, props.selectSlotProps),
  };

  if (props.value === undefined) {
    delete selectProps.value;
  }

  if (props.defaultValue !== undefined) {
    selectProps.defaultValue = props.defaultValue;
  }

  return createElement(
    Box,
    mergeSlotStyleProps(styles.root, props.slotProps),
    createElement(
      Text,
      {
        as: 'label',
        htmlFor: selectId,
        ...hiddenLabelProps,
        ...mergeSlotStyleProps(styles.label, props.labelSlotProps),
      },
      labelText,
    ),
    createElement(
      Box,
      selectProps,
      props.includeAll
        ? createElement(
            'option',
            { key: allValue, value: allValue },
            allLabelText,
          )
        : null,
      options.map((option) =>
        createElement(
          'option',
          { key: option.id, value: option.id },
          option.label,
        ),
      ),
    ),
  );
}

export function createDocsVersionOptions(
  collections: DocsCollection[],
): DocsVersionOption[] {
  return createCollectionOptions(collections);
}

export function MarkdownContent(props: MarkdownContentProps): ReactNode {
  const config = useDocsConfig();
  const blocks = parseMarkdown(props.source);
  const createNextHeadingId = createHeadingIdGenerator();
  const scrollMarginTop =
    config.layout?.scrollMarginTop ?? config.layout?.stickyTop ?? 8;
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.markdownContent,
    chakraDocsMarkdownContentSlotRecipe,
  );
  const styles = recipe();

  return createElement(
    Stack,
    mergeSlotStyleProps(styles.root, props.slotProps),
    blocks.map((block, index) =>
      renderMarkdownBlock(
        block,
        index,
        createNextHeadingId,
        scrollMarginTop,
        recipe,
        props,
      ),
    ),
  );
}

export function DocsPagination(props: DocsPaginationProps): ReactNode {
  const labels = useDocsConfig().labels ?? defaultLabels;
  const pages = flattenNav(props.nav ?? []).filter((item) => item.href);
  const index = pages.findIndex((item) => item.href === props.page?.route);
  const previous = index > 0 ? pages[index - 1] : undefined;
  const next =
    index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined;
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.pagination,
    chakraDocsPaginationSlotRecipe,
  );
  const styles = recipe();

  if (!previous && !next) {
    return null;
  }

  return createElement(
    Box,
    {
      as: 'nav',
      ...mergeSlotStyleProps(styles.root, props.slotProps),
    },
    previous
      ? createElement(
          Box,
          {
            'data-direction': 'previous',
            ...mergeSlotStyleProps(
              recipe({ direction: 'previous' }).item,
              props.itemSlotProps,
            ),
          },
          createElement(
            Text,
            mergeSlotStyleProps(styles.label, props.labelSlotProps),
            labels.previousPage,
          ),
          createElement(
            DocsLink,
            {
              href: previous.href ?? '#',
              ...mergeSlotStyleProps(styles.link, props.linkSlotProps),
            },
            previous.title,
          ),
        )
      : createElement(Box),
    next
      ? createElement(
          Box,
          {
            'data-direction': 'next',
            ...mergeSlotStyleProps(
              recipe({ direction: 'next' }).item,
              props.itemSlotProps,
            ),
          },
          createElement(
            Text,
            mergeSlotStyleProps(styles.label, props.labelSlotProps),
            labels.nextPage,
          ),
          createElement(
            DocsLink,
            {
              href: next.href ?? '#',
              ...mergeSlotStyleProps(styles.link, props.linkSlotProps),
            },
            next.title,
          ),
        )
      : createElement(Box),
  );
}

export interface CalloutProps extends DocsComponentProps {
  type?: 'info' | 'warning' | 'success' | 'danger';
  title?: string;
  contentSlotProps?: Record<string, unknown>;
  titleSlotProps?: Record<string, unknown>;
}

export function Callout(props: CalloutProps): ReactNode {
  const recipe = useChakraDocsSlotRecipe(
    chakraDocsRecipeKeys.callout,
    chakraDocsCalloutSlotRecipe,
  );
  const styles = recipe({ status: props.type ?? 'info' });

  return createElement(
    Box,
    mergeSlotStyleProps(styles.root, props.slotProps),
    props.title
      ? createElement(
          Text,
          mergeSlotStyleProps(styles.title, props.titleSlotProps),
          props.title,
        )
      : null,
    createElement(
      Box,
      mergeSlotStyleProps(styles.content, props.contentSlotProps),
      props.children,
    ),
  );
}

export interface CodeBlockProps extends DocsComponentProps {
  code?: string;
  copy?: boolean;
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
      onCopy:
        code && copy
          ? () =>
              config.analytics?.onCodeCopy?.({
                code,
                language: props.language,
                title: props.title,
              })
          : undefined,
      ...mergeSlotStyleProps(styles.root, props.slotProps),
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
                      copied: copiedLabel,
                      ...mergeSlotStyleProps(
                        styles.copyIndicator,
                        props.copyIndicatorSlotProps,
                      ),
                    },
                    copyLabel,
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

interface SearchResultProps {
  active: boolean;
  id: string;
  index: number;
  onActivate: () => void;
  onSelect: (event: DocsAnchorClickEvent) => void;
  recipe: (props?: Record<string, unknown>) => Record<string, unknown>;
  record: DocsSearchResult;
  resultBadgeSlotProps?: Record<string, unknown>;
  resultContentSlotProps?: Record<string, unknown>;
  resultDescriptionSlotProps?: Record<string, unknown>;
  resultLinkSlotProps?: Record<string, unknown>;
  resultRowSlotProps?: Record<string, unknown>;
  resultTitleSlotProps?: Record<string, unknown>;
  slotProps?: Record<string, unknown>;
}

function SearchResult(props: SearchResultProps): ReactNode {
  const description = props.record.sectionTitle
    ? (props.record.pageTitle ?? props.record.description)
    : props.record.description;
  const styles = props.recipe({ active: props.active });

  return createElement(
    Box,
    {
      ...mergeSlotStyleProps(styles.result, props.slotProps),
      'data-search-result-index': props.index,
      role: 'presentation',
    },
    createElement(
      DocsLink,
      {
        href: props.record.route,
        onClick: props.onSelect,
        ...mergeSlotStyleProps(styles.resultLink, props.resultLinkSlotProps),
        id: props.id,
        role: 'option',
        'aria-selected': props.active,
        tabIndex: -1,
        onPointerMove: props.onActivate,
        onMouseDown: (event: DocsAnchorClickEvent) => {
          // Keep typing focus in the combobox, including when a modified
          // click opens a result in another tab. Do not cancel the click.
          if (event.button === 0) event.preventDefault();
        },
      },
      createElement(
        HStack,
        mergeSlotStyleProps(styles.resultRow, props.resultRowSlotProps),
        createElement(
          Stack,
          mergeSlotStyleProps(
            styles.resultContent,
            props.resultContentSlotProps,
          ),
          createElement(
            Text,
            mergeSlotStyleProps(styles.resultTitle, props.resultTitleSlotProps),
            props.record.title,
          ),
          description
            ? createElement(
                Text,
                mergeSlotStyleProps(
                  styles.resultDescription,
                  props.resultDescriptionSlotProps,
                ),
                description,
              )
            : null,
        ),
        props.record.tags?.length
          ? createElement(
              Badge,
              {
                variant: 'subtle',
                ...mergeSlotStyleProps(
                  styles.resultBadge,
                  props.resultBadgeSlotProps,
                ),
              },
              props.record.tags[0],
            )
          : null,
      ),
    ),
  );
}

function createSearchStatus(
  message: string,
  role: 'alert' | 'status',
  styles: unknown,
  slotProps: Record<string, unknown> | undefined,
): ReactNode {
  return createElement(
    Text,
    {
      role,
      ...mergeSlotStyleProps(styles, slotProps),
    },
    message,
  );
}

export function filterSearchRecordsByCollections(
  records: DocsSearchRecord[],
  collectionIds: readonly string[] | undefined,
): DocsSearchRecord[] {
  const scope = normalizeCollectionIds(collectionIds);

  if (!scope) {
    return records;
  }

  return records.filter(
    (record) =>
      record.collectionId !== undefined && scope.has(record.collectionId),
  );
}

function resolveSearchCollectionIds(
  props: Pick<DocsSearchProps, 'collectionId' | 'collectionIds'>,
): string[] | undefined {
  const collectionIds =
    props.collectionIds ??
    (props.collectionId ? [props.collectionId] : undefined);
  const normalized = [...new Set(collectionIds?.filter(Boolean) ?? [])];
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCollectionIds(
  collectionIds: readonly string[] | undefined,
): Set<string> | undefined {
  const ids = collectionIds?.filter(Boolean) ?? [];
  return ids.length > 0 ? new Set(ids) : undefined;
}

function renderMarkdownBlock(
  block: MarkdownBlock,
  index: number,
  createNextHeadingId: (title: string) => string,
  scrollMarginTop: ChakraDocsStickyTop,
  recipe: (props?: Record<string, unknown>) => Record<string, unknown>,
  slotProps: MarkdownContentProps,
): ReactNode {
  const styles = recipe({
    headingLevel:
      block.type === 'heading' && block.level === 2 ? 'section' : 'subsection',
  });

  if (block.type === 'heading') {
    const headingTitle = stripMarkdown(block.text);
    const headingId = createNextHeadingId(headingTitle);

    return createElement(
      Heading,
      {
        as: headingElement(block.level),
        id: headingId,
        key: `${block.type}-${index}`,
        size: block.level === 2 ? '2xl' : 'xl',
        scrollMarginTop,
        ...mergeSlotStyleProps(styles.heading, slotProps.headingSlotProps),
      },
      renderInlineMarkdown(block.text, recipe, slotProps),
      slotProps.headingPermalinks
        ? createElement(DocsHeadingPermalink, {
            headingId,
            href: slotProps.getHeadingHref?.(headingId),
            indicatorSlotProps: slotProps.headingPermalinkIndicatorSlotProps,
            slotProps: slotProps.headingPermalinkSlotProps,
            title: headingTitle,
            triggerSlotProps: slotProps.headingPermalinkTriggerSlotProps,
          })
        : null,
    );
  }

  if (block.type === 'paragraph') {
    return createElement(
      Text,
      {
        key: `${block.type}-${index}`,
        ...mergeSlotStyleProps(styles.paragraph, slotProps.paragraphSlotProps),
      },
      renderInlineMarkdown(block.text, recipe, slotProps),
    );
  }

  if (block.type === 'list') {
    return createElement(
      Box,
      {
        as: 'ul',
        key: `${block.type}-${index}`,
        ...mergeSlotStyleProps(styles.list, slotProps.listSlotProps),
      },
      block.items.map((item) =>
        createElement(
          Box,
          {
            as: 'li',
            key: item,
            ...mergeSlotStyleProps(
              styles.listItem,
              slotProps.listItemSlotProps,
            ),
          },
          renderInlineMarkdown(item, recipe, slotProps),
        ),
      ),
    );
  }

  if (block.type === 'quote') {
    return createElement(
      Callout,
      {
        key: `${block.type}-${index}`,
        slotProps: mergeSlotStyleProps(styles.quote, slotProps.quoteSlotProps),
        title: 'Note',
      },
      renderInlineMarkdown(block.text, recipe, slotProps),
    );
  }

  return createElement(CodeBlock, {
    ...slotProps.codeBlockProps,
    code: block.code,
    key: `${block.type}-${index}`,
    language: normalizeCodeLanguage(block.language),
    slotProps: mergeComponentSlotProps(
      styles.codeBlock,
      slotProps.codeBlockProps?.slotProps,
      slotProps.codeBlockSlotProps,
    ),
  });
}

function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.trim().split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = /^(```|~~~)(.*)$/.exec(line);

    if (fence) {
      const marker = fence[1];
      const language = fence[2].trim() || undefined;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith(marker)) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({ type: 'code', language, code: codeLines.join('\n') });
      continue;
    }

    const headingMatch = /^(#{2,6})\s+(.+)$/.exec(line);

    if (headingMatch) {
      const title = stripMarkdown(headingMatch[2]).trim();

      if (!title) {
        blocks.push({ type: 'paragraph', text: line });
        index += 1;
        continue;
      }

      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      index += 1;
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^-\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^-\s+/, ''));
        index += 1;
      }

      blocks.push({ type: 'list', items });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }

      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length && isParagraphLine(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function isParagraphLine(line: string): boolean {
  return (
    Boolean(line.trim()) &&
    !/^(```|~~~)/.test(line) &&
    !/^(#{2,6})\s+/.test(line) &&
    !/^-\s+/.test(line) &&
    !/^>\s?/.test(line)
  );
}

function renderInlineMarkdown(
  text: string,
  recipe: (props?: Record<string, unknown>) => Record<string, unknown>,
  slotProps: MarkdownContentProps,
): ReactNode[] {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .filter(Boolean)
    .map((part, index) =>
      renderInlineMarkdownPart(part, index, recipe, slotProps),
    );
}

function renderInlineMarkdownPart(
  part: string,
  index: number,
  recipe: (props?: Record<string, unknown>) => Record<string, unknown>,
  slotProps: MarkdownContentProps,
): ReactNode {
  const key = `${part}-${index}`;
  const styles = recipe();

  if (part.startsWith('`') && part.endsWith('`')) {
    return createElement(
      Code,
      {
        key,
        variant: 'subtle',
        ...mergeSlotStyleProps(
          styles.inlineCode,
          slotProps.inlineCodeSlotProps,
        ),
      },
      part.slice(1, -1),
    );
  }

  if (part.startsWith('**') && part.endsWith('**')) {
    return createElement('strong', { key }, part.slice(2, -2));
  }

  const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);

  if (linkMatch) {
    return createElement(
      DocsLink,
      {
        href: linkMatch[2],
        key,
        ...mergeSlotStyleProps(styles.link, slotProps.linkSlotProps),
      },
      linkMatch[1],
    );
  }

  return part;
}

function headingElement(level: number): string {
  if (level === 2) return 'h2';
  if (level === 3) return 'h3';
  if (level === 4) return 'h4';
  if (level === 5) return 'h5';
  return 'h6';
}

function normalizeCodeLanguage(
  language: string | undefined,
): string | undefined {
  if (language === 'md') return 'markdown';
  if (language === 'txt') return 'text';
  if (language === 'sh') return 'bash';
  return language;
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

function DocsLink(props: DocsLinkProps): ReactNode {
  const config = useDocsConfig();
  const LinkComponent = config.linkComponent;

  if (!isSafeLinkHref(props.href)) {
    return createElement('span', null, props.children);
  }

  if (LinkComponent && isInternalHref(props.href)) {
    return createElement(
      Link,
      { asChild: true, ...props },
      createElement(LinkComponent, { href: props.href }, props.children),
    );
  }

  return createElement(Link, props);
}

function isInternalHref(href: string): boolean {
  const value = href.trim();

  return !value.startsWith('//') && !/^[a-z][a-z\d+.-]*:/i.test(value);
}

function NavList(props: {
  items: DocsNavItem[];
  activeRoute?: string;
  badgeSlotProps?: Record<string, unknown>;
  collapsible: boolean;
  contentIdPrefix: string;
  contentSlotProps?: Record<string, unknown>;
  childrenSlotProps?: Record<string, unknown>;
  expandedIds: ReadonlySet<string>;
  indicatorSlotProps?: Record<string, unknown>;
  itemSlotProps?: Record<string, unknown>;
  linkSlotProps?: Record<string, unknown>;
  listSlotProps?: Record<string, unknown>;
  path?: readonly number[];
  recipe: (props?: Record<string, unknown>) => Record<string, unknown>;
  sectionTitleSlotProps?: Record<string, unknown>;
  toggleExpanded: (id: string) => void;
  triggerSlotProps?: Record<string, unknown>;
}): ReactNode {
  const styles = props.recipe();
  const path = props.path ?? [];

  return createElement(
    Box,
    {
      as: 'ol',
      ...mergeSlotStyleProps(styles.list, props.listSlotProps),
    },
    props.items
      .filter((item) => !item.hidden)
      .map((item, index) => {
        const children = (item.children ?? []).filter((child) => !child.hidden);
        const hasChildren = children.length > 0;
        const expanded = !props.collapsible || props.expandedIds.has(item.id);
        const active = item.href === props.activeRoute;
        const itemStyles = props.recipe({
          active,
          expanded,
          linked: Boolean(item.href),
        });
        const contentId = `${props.contentIdPrefix}-section-${[
          ...path,
          index,
        ].join('-')}`;
        const indicator =
          hasChildren && props.collapsible
            ? createElement(
                Box,
                {
                  ...mergeSlotStyleProps(
                    itemStyles.indicator,
                    props.indicatorSlotProps,
                  ),
                  as: 'span',
                  'aria-hidden': 'true',
                  'data-state': expanded ? 'open' : 'closed',
                },
                '›',
              )
            : null;
        const disclosureTrigger =
          hasChildren && props.collapsible
            ? createElement(
                Box,
                {
                  ...(item.href
                    ? mergeSlotStyleProps(
                        itemStyles.trigger,
                        props.triggerSlotProps,
                      )
                    : mergeSidebarSlotProps(
                        [styles.sectionTitle, itemStyles.trigger],
                        props.sectionTitleSlotProps,
                        props.triggerSlotProps,
                      )),
                  as: 'button',
                  type: 'button',
                  'aria-controls': contentId,
                  'aria-expanded': expanded,
                  'aria-label': item.href
                    ? `${expanded ? 'Collapse' : 'Expand'} ${item.title}`
                    : undefined,
                  'data-state': expanded ? 'open' : 'closed',
                  onClick: () => props.toggleExpanded(item.id),
                },
                item.href ? null : item.title,
                indicator,
              )
            : null;

        return createElement(
          Box,
          {
            as: 'li',
            key: item.id,
            ...mergeSlotStyleProps(styles.item, props.itemSlotProps),
          },
          item.href
            ? createElement(
                DocsLink,
                {
                  href: item.href,
                  'aria-current': active ? 'page' : undefined,
                  ...mergeSlotStyleProps(itemStyles.link, props.linkSlotProps),
                },
                item.title,
              )
            : (disclosureTrigger ??
                createElement(
                  Text,
                  mergeSlotStyleProps(
                    styles.sectionTitle,
                    props.sectionTitleSlotProps,
                  ),
                  item.title,
                )),
          item.href ? disclosureTrigger : null,
          item.badge
            ? createElement(
                Badge,
                {
                  'data-badge': item.badge,
                  title: item.badge,
                  ...mergeSlotStyleProps(styles.badge, props.badgeSlotProps),
                },
                item.badge,
              )
            : null,
          hasChildren
            ? createElement(
                Box,
                {
                  ...mergeSidebarSlotProps(
                    [styles.children, itemStyles.content],
                    props.childrenSlotProps,
                    props.contentSlotProps,
                  ),
                  id: contentId,
                  'data-state': expanded ? 'open' : 'closed',
                },
                createElement(NavList, {
                  activeRoute: props.activeRoute,
                  badgeSlotProps: props.badgeSlotProps,
                  collapsible: props.collapsible,
                  contentIdPrefix: props.contentIdPrefix,
                  contentSlotProps: props.contentSlotProps,
                  childrenSlotProps: props.childrenSlotProps,
                  expandedIds: props.expandedIds,
                  indicatorSlotProps: props.indicatorSlotProps,
                  itemSlotProps: props.itemSlotProps,
                  items: children,
                  linkSlotProps: props.linkSlotProps,
                  listSlotProps: props.listSlotProps,
                  path: [...path, index],
                  recipe: props.recipe,
                  sectionTitleSlotProps: props.sectionTitleSlotProps,
                  toggleExpanded: props.toggleExpanded,
                  triggerSlotProps: props.triggerSlotProps,
                }),
              )
            : null,
        );
      }),
  );
}

function mergeSidebarSlotProps(
  styles: unknown,
  legacySlotProps: Record<string, unknown> | undefined,
  slotProps: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const { css: legacyCss, ...legacyProps } = legacySlotProps ?? {};
  const { css, ...props } = slotProps ?? {};

  return {
    css: [styles, legacyCss, css],
    ...legacyProps,
    ...props,
  };
}

function mergeComponentSlotProps(
  styles: unknown,
  ...slotProps: (Record<string, unknown> | undefined)[]
): Record<string, unknown> {
  const mergedProps: Record<string, unknown> = {};
  const css: unknown[] = [styles];

  for (const current of slotProps) {
    const { css: currentCss, ...currentProps } = current ?? {};

    css.push(currentCss);
    Object.assign(mergedProps, currentProps);
  }

  return { css, ...mergedProps };
}

function flattenNav(items: DocsNavItem[]): DocsNavItem[] {
  return items.flatMap((item) => [item, ...flattenNav(item.children ?? [])]);
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
    layout: {
      ...inherited.layout,
      ...next?.layout,
    },
    labels: {
      ...defaultLabels,
      ...inherited.labels,
      ...next?.labels,
    },
  };
}
