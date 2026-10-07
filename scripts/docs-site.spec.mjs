import './oss-credits.test.mjs';
import './search-recommendations.test.mjs';
import './site-seo.test.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  getFontstackKitUrl,
  SHARED_FONTSTACK_KIT_URL,
} from '../apps/docs/src/lib/public-env.ts';
import {
  getOgImageContent,
  OG_IMAGE_DEFAULTS,
} from '../apps/docs/src/lib/og-image.ts';

const read = (path) =>
  readFileSync(new URL(`../apps/docs/${path}`, import.meta.url), 'utf8');

test('OG capture copy is bounded Unicode text with safe defaults', () => {
  assert.deepEqual(getOgImageContent(new URLSearchParams()), OG_IMAGE_DEFAULTS);
  const copy = getOgImageContent(
    new URLSearchParams({ title: '  Docs\n for everyone  ', description: ' ' }),
  );
  assert.deepEqual(copy, {
    title: 'Docs for everyone',
    description: OG_IMAGE_DEFAULTS.description,
  });
  const long = getOgImageContent(
    new URLSearchParams({
      title: '😀'.repeat(101),
      description: 'x'.repeat(201),
    }),
  );
  assert.equal(Array.from(long.title).length, 100);
  assert.equal(long.description.length, 200);
  assert.equal(
    getOgImageContent(new URLSearchParams({ title: '<script>bad()</script>' }))
      .title,
    '<script>bad()</script>',
  );
});

test('OG capture shares the fixed recipe but bypasses analytics and site chrome', () => {
  const recipe = read('src/theme/og-image.ts');
  assert.match(recipe, /w: '1200px'/);
  assert.match(recipe, /h: '630px'/);
  assert.match(read('src/pages/og-image/[[...slug]].tsx'), /noindex, nofollow/);
  const app = read('src/pages/_app.tsx');
  assert.ok(
    app.indexOf("router.pathname === '/og-image/[[...slug]]'") <
      app.indexOf('<Analytics>'),
  );
  const card = read('src/components/og-image-card.tsx');
  assert.match(card, /data-og-ready/);
  assert.match(card, /document.fonts\?\.ready/);
  assert.match(card, /image.decode/);
  assert.doesNotMatch(card, /dangerouslySetInnerHTML/);
});

test('social-image aliases preserve page paths and do not masquerade as PNG files', () => {
  const config = read('next.config.js');
  assert.match(config, /source: '\/:path\*\/social-image'/);
  assert.match(config, /destination: '\/og-image\/:path\*'/);
  assert.match(config, /X-Robots-Tag/);
  assert.doesNotMatch(config, /source: [^\n]+social-image\\?\.png/);
  const route = read('src/pages/og-image/[[...slug]].tsx');
  assert.match(route, /manifest\.byRoute\[route\]/);
  assert.match(route, /notFound: true/);
  const defaults = {
    title: 'Installation',
    description: 'Install Chakra Docs.',
  };
  assert.deepEqual(
    getOgImageContent(new URLSearchParams(), defaults),
    defaults,
  );
  assert.deepEqual(
    getOgImageContent(new URLSearchParams({ title: 'Custom' }), defaults),
    { ...defaults, title: 'Custom' },
  );
});

test('site omits starter branding and the Next development indicator', () => {
  assert.match(read('next.config.js'), /devIndicators:\s*false/);
  assert.match(read('next.config.js'), /poweredByHeader:\s*false/);
  assert.match(
    read('src/pages/_document.tsx'),
    /rel="icon"[\s\S]*data:image\/svg\+xml/,
  );
  assert.equal(
    existsSync(new URL('../apps/docs/public/favicon.ico', import.meta.url)),
    false,
  );
});

test('shared OSS font kit is default, configurable, and restricted to Fontstack', () => {
  const saved = process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL;
  try {
    delete process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL;
    assert.equal(getFontstackKitUrl(), SHARED_FONTSTACK_KIT_URL);
    process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL = '';
    assert.equal(getFontstackKitUrl(), undefined);
    process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL =
      'https://kits.fontstack.com/kit/other.css';
    assert.equal(
      getFontstackKitUrl(),
      process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL,
    );
    for (const value of [
      'https://example.com/kit/a.css',
      'http://kits.fontstack.com/kit/a.css',
      'https://user:pass@kits.fontstack.com/kit/a.css',
      'https://kits.fontstack.com/kit/a.css?x=1',
      'https://kits.fontstack.com/a.css',
      'not-a-url',
    ]) {
      process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL = value;
      assert.throws(getFontstackKitUrl);
    }
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL;
    else process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL = saved;
  }
});

test('fonts are document-owned and the theme provider precedes Emotion styles', () => {
  assert.match(read('src/pages/_document.tsx'), /getFontstackKitUrl/);
  assert.match(read('src/pages/_document.tsx'), /crossOrigin="anonymous"/);
  const app = read('src/pages/_app.tsx');
  assert.ok(app.indexOf('<ThemeProvider') < app.indexOf('<PostkitProvider'));
  assert.match(app, /defaultTheme="system"/);
  assert.match(app, /<SiteFooter/);
  assert.match(app, /<CommuneFooter/);
});

test('site footer fills the viewport before the Commune section', () => {
  const app = read('src/pages/_app.tsx');
  assert.match(
    app,
    /className="site-wrapper"[\s\S]*display="flex"[\s\S]*flexDirection="column"[\s\S]*minH="100dvh"/,
  );
  assert.match(
    app,
    /className="site-content"[\s\S]*flexGrow="1"[\s\S]*<Component[^>]+\/>[\s\S]*<SiteFooter[^>]+\/>[\s\S]*<\/Box>\s*<CommuneFooter/,
  );
  const recipes = read('src/theme/site-recipes.ts');
  assert.doesNotMatch(recipes, /minH: '100vh'/);
  assert.doesNotMatch(recipes, /calc\(100vh - \{sizes\.siteHeader\}\)/);
});

test('shared OSS artwork matches the approved asset', () => {
  const asset = read('public/assets/oss.svg').trim();
  assert.equal(
    createHash('sha256').update(asset).digest('hex'),
    '50860e5039199dbd34ef7ab03ff9e1b17c28dc69c199b3d0c299ab8d17b2de31',
  );
  assert.match(read('public/assets/commune-software-wordmark.svg'), /<svg/);
});

test('Chakra Docs footer starts its copyright range in 2026', () => {
  const footer = read('src/components/site-footer.tsx');
  assert.ok(footer.includes('year > 2026 ? `2026–${year}` : 2026'));
  assert.doesNotMatch(footer, /2025/);
});

test('site chrome is theme-only and exposes composed Next links', () => {
  const shell = read('src/components/site-shell.tsx');
  assert.match(shell, /useSlotRecipe/);
  assert.match(shell, /as="main"/);
  assert.doesNotMatch(shell, /style=|colorPalette="teal"/);
  assert.match(read('src/components/site-link.tsx'), /<NextLink/);
  assert.match(read('src/theme/system.ts'), /'#000000'/);
});
