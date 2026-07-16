import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocsLink, NextLink } from './link.js';

describe('NextLink', () => {
  it('renders an anchor with the given href', () => {
    const html = renderToStaticMarkup(
      createElement(
        NextLink,
        { href: '/docs/getting-started' },
        'Getting started',
      ),
    );

    expect(html).toContain('<a');
    expect(html).toContain('href="/docs/getting-started"');
    expect(html).toContain('Getting started');
  });

  it('forwards className to the rendered anchor', () => {
    const html = renderToStaticMarkup(
      createElement(
        NextLink,
        { href: '/docs/getting-started', className: 'docs-link' },
        'Getting started',
      ),
    );

    expect(html).toContain('class="docs-link"');
  });

  it('exports DocsLink as an alias for NextLink', () => {
    expect(DocsLink).toBe(NextLink);
  });
});
