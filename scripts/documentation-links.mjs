import { JSDOM } from 'jsdom';

export function markdownLinkTargets(markdown) {
  const prose = markdown.replace(/^```[^\n]*\r?\n[\s\S]*?^```\s*$/gm, '');
  return Array.from(prose.matchAll(/\]\(([^)\s]+)\)/g), ([, href]) => href);
}

export function hasExactLink(targets, expectedHref) {
  const expected = new URL(expectedHref);
  return targets.some((href) => {
    try {
      const actual = new URL(href);
      return (
        actual.username === '' &&
        actual.password === '' &&
        actual.href === expected.href
      );
    } catch {
      return false;
    }
  });
}

export function discoveryLinkTargets(content, filename) {
  if (filename === 'llms.txt') return markdownLinkTargets(content);
  if (filename === 'llms-full.txt') {
    return Array.from(
      content.matchAll(/^Source: (\S+)\s*$/gm),
      ([, href]) => href,
    );
  }
  if (filename === 'sitemap.xml') {
    const dom = new JSDOM(content, { contentType: 'application/xml' });
    try {
      return Array.from(
        dom.window.document.querySelectorAll('url > loc'),
        (node) => node.textContent.trim(),
      );
    } finally {
      dom.window.close();
    }
  }
  throw new Error(`Unsupported discovery document: ${filename}`);
}
