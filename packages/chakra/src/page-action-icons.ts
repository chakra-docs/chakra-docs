import { createElement, type ReactNode } from 'react';

interface DocsPageActionIconProps {
  children: ReactNode;
}

function DocsPageActionIcon({ children }: DocsPageActionIconProps): ReactNode {
  return createElement(
    'svg',
    {
      'aria-hidden': 'true',
      fill: 'none',
      height: '1em',
      viewBox: '0 0 16 16',
      width: '1em',
    },
    children,
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: '1.5',
} as const;

export function PageActionsCopyIcon(): ReactNode {
  return createElement(
    DocsPageActionIcon,
    null,
    createElement('rect', {
      ...stroke,
      height: 9,
      rx: 1.5,
      width: 8,
      x: 5,
      y: 5,
    }),
    createElement('path', {
      ...stroke,
      d: 'M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v7A1.5 1.5 0 0 0 3.5 12H5',
    }),
  );
}

export function PageActionsLinkIcon(): ReactNode {
  return createElement(
    DocsPageActionIcon,
    null,
    createElement('path', {
      ...stroke,
      d: 'm6.25 9.75 3.5-3.5M5.1 11.9l-1 .1a3 3 0 0 1 0-6h2M10.9 4.1l1-.1a3 3 0 1 1 0 6h-2',
    }),
  );
}

export function PageActionsDocumentIcon(): ReactNode {
  return createElement(
    DocsPageActionIcon,
    null,
    createElement('path', {
      ...stroke,
      d: 'M4 2.5h5L12.5 6v7.5H4zM9 2.5V6h3.5M6 9h4M6 11.5h4',
    }),
  );
}

export function PageActionsEditIcon(): ReactNode {
  return createElement(
    DocsPageActionIcon,
    null,
    createElement('path', {
      ...stroke,
      d: 'm10.75 2.75 2.5 2.5-7.5 7.5-3 .5.5-3zM9.75 3.75l2.5 2.5',
    }),
  );
}

export function PageActionsChevronIcon(): ReactNode {
  return createElement(
    DocsPageActionIcon,
    null,
    createElement('path', { ...stroke, d: 'm4 6 4 4 4-4' }),
  );
}

export function PageActionsSubmenuIcon(): ReactNode {
  return createElement(
    DocsPageActionIcon,
    null,
    createElement('path', { ...stroke, d: 'm6 4 4 4-4 4' }),
  );
}
