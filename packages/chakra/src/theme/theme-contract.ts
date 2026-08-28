export interface ChakraDocsRecipeKeyMap {
  readonly apiTable: 'chakraDocsApiTable';
  readonly article: 'chakraDocsArticle';
  readonly badge: 'chakraDocsBadge';
  readonly breadcrumbs: 'chakraDocsBreadcrumbs';
  readonly callout: 'chakraDocsCallout';
  readonly cards: 'chakraDocsCards';
  readonly codeBlock: 'chakraDocsCodeBlock';
  readonly feedback: 'chakraDocsFeedback';
  readonly headingPermalink: 'chakraDocsHeadingPermalink';
  readonly layout: 'chakraDocsLayout';
  readonly markdownContent: 'chakraDocsMarkdownContent';
  readonly mobileNavigation: 'chakraDocsMobileNavigation';
  readonly mobileTableOfContents: 'chakraDocsMobileTableOfContents';
  readonly pageActions: 'chakraDocsPageActions';
  readonly pagination: 'chakraDocsPagination';
  readonly search: 'chakraDocsSearch';
  readonly sidebar: 'chakraDocsSidebar';
  readonly steps: 'chakraDocsSteps';
  readonly tableOfContents: 'chakraDocsTableOfContents';
  readonly tabs: 'chakraDocsTabs';
  readonly versionSelect: 'chakraDocsVersionSelect';
}

export type ChakraDocsRecipeKey =
  ChakraDocsRecipeKeyMap[keyof ChakraDocsRecipeKeyMap];

/** A deliberately shallow style object that avoids recursive Chakra types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChakraDocsThemeStyleObject = Readonly<Record<string, any>>;

/** The portable public shape shared by every Chakra Docs slot recipe. */
export interface ChakraDocsSlotRecipeConfig {
  readonly className?: string;
  readonly slots: readonly string[];
  readonly base: Readonly<Record<string, ChakraDocsThemeStyleObject>>;
  readonly variants?: Readonly<
    Record<
      string,
      Readonly<
        Record<string, Readonly<Record<string, ChakraDocsThemeStyleObject>>>
      >
    >
  >;
  readonly defaultVariants?: Readonly<
    Record<string, string | number | boolean>
  >;
}

/** A lightweight public config that remains consumable by Chakra createSystem. */
export interface ChakraDocsThemeConfig {
  readonly theme: {
    readonly slotRecipes: Readonly<
      Record<ChakraDocsRecipeKey, ChakraDocsSlotRecipeConfig>
    >;
  };
}
