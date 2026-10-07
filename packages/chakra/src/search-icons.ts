import { createElement, type ReactNode } from 'react';

interface DocsSearchIconProps {
  children: ReactNode;
}

function DocsSearchIcon({ children }: DocsSearchIconProps): ReactNode {
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

export function SearchMagnifierIcon(): ReactNode {
  return createElement(
    DocsSearchIcon,
    null,
    createElement('circle', { ...stroke, cx: 7, cy: 7, r: 4.25 }),
    createElement('path', { ...stroke, d: 'm10.25 10.25 3 3' }),
  );
}

export function SearchClearIcon(): ReactNode {
  return createElement(
    DocsSearchIcon,
    null,
    createElement('path', { ...stroke, d: 'm4 4 8 8M12 4l-8 8' }),
  );
}
