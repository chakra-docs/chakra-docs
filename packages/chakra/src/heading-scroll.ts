export type ChakraDocsStickyTop =
  | string
  | number
  | Array<string | number | null | undefined>
  | Record<string, string | number | null | undefined>;

export type DocsScrollBehavior = 'auto' | 'smooth';

export type DocsElementRect = {
  top: number;
  bottom: number;
};

export type DocsHeadingElement = {
  clientHeight?: number;
  scrollTop?: number;
  getBoundingClientRect?: () => DocsElementRect;
  scrollIntoView?: (options?: {
    behavior?: DocsScrollBehavior;
    block?: 'start';
  }) => void;
};

export type DocsBrowserDocument = {
  body?: DocsHeadingElement;
  documentElement?: DocsHeadingElement;
  getElementById?: (id: string) => DocsHeadingElement | null;
};

export type DocsBrowserWindow = {
  document?: DocsBrowserDocument;
  history?: {
    pushState?: (data: unknown, unused: string, url?: string) => void;
  };
  innerHeight?: number;
  location?: {
    hash?: string;
    pathname?: string;
    search?: string;
  };
  pageYOffset?: number;
  scrollY?: number;
  addEventListener?: (
    type: string,
    listener: () => void,
    options?: unknown,
  ) => void;
  cancelAnimationFrame?: (id: number) => void;
  getComputedStyle?: (element: DocsHeadingElement) => {
    scrollMarginBlockStart?: string;
    scrollMarginTop?: string;
  };
  matchMedia?: (query: string) => { matches?: boolean };
  removeEventListener?: (type: string, listener: () => void) => void;
  requestAnimationFrame?: (callback: () => void) => number;
  scrollTo?: (options: { behavior?: DocsScrollBehavior; top: number }) => void;
  window?: DocsBrowserWindow;
};

export type DocsBrowserEnv = {
  document: DocsBrowserDocument;
  window: DocsBrowserWindow;
};

export function getActiveHeadingId(
  env: DocsBrowserEnv,
  headingIds: string[],
  scrollMarginTop: ChakraDocsStickyTop,
): string | undefined {
  const viewportHeight =
    env.window.innerHeight ?? env.document.documentElement?.clientHeight ?? 0;
  let activeHeadingId: string | undefined;
  let visibleHeadingId: string | undefined;

  for (const headingId of headingIds) {
    const element = env.document.getElementById?.(headingId);
    const rect = element?.getBoundingClientRect?.();

    if (!element || !rect) {
      continue;
    }

    const offset = getHeadingScrollOffset(element, scrollMarginTop, env.window);
    const activationPoint = offset + 1;

    if (rect.top <= activationPoint) {
      activeHeadingId = headingId;
    }

    if (
      !visibleHeadingId &&
      rect.bottom > offset &&
      rect.top < viewportHeight
    ) {
      visibleHeadingId = headingId;
    }
  }

  return activeHeadingId ?? visibleHeadingId;
}

export function getHeadingScrollOffset(
  element: DocsHeadingElement,
  fallback: ChakraDocsStickyTop,
  win: DocsBrowserWindow,
): number {
  const styles = win.getComputedStyle?.(element);
  const scrollMargin = parseCssPixelValue(
    styles?.scrollMarginBlockStart ?? styles?.scrollMarginTop,
  );

  return (
    scrollMargin || parseScrollOffsetValue(resolveResponsiveValue(fallback))
  );
}

function resolveResponsiveValue(
  value: ChakraDocsStickyTop,
): string | number | undefined {
  if (Array.isArray(value)) {
    return findLastDefined(value);
  }

  if (typeof value === 'object') {
    return findLastDefined(Object.values(value));
  }

  return value;
}

function findLastDefined<TValue>(
  values: Array<TValue | null | undefined>,
): TValue | undefined {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];

    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function parseScrollOffsetValue(value: string | number | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  return parseCssPixelValue(value);
}

function parseCssPixelValue(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
