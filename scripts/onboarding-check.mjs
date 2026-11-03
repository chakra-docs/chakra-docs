import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import { hasExactLink, markdownLinkTargets } from './documentation-links.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (filename) => readFileSync(path.join(root, filename), 'utf8');

export function extractQuickstart(markdown, filename) {
  const start = '<!-- quickstart:start -->';
  const end = '<!-- quickstart:end -->';
  assert.equal(
    markdown.split(start).length,
    2,
    `${filename}: one start marker`,
  );
  assert.equal(markdown.split(end).length, 2, `${filename}: one end marker`);
  assert.ok(
    markdown.indexOf(start) < markdown.indexOf(end),
    `${filename}: marker order`,
  );
  const section = markdown.split(start)[1].split(end)[0];
  const examples = [...section.matchAll(/^```(tsx?)\r?\n([\s\S]*?)^```\s*$/gm)];
  assert.equal(examples.length, 1, `${filename}: one complete TS/TSX example`);
  assert.ok(examples[0][2].trim(), `${filename}: nonempty example`);
  return { language: examples[0][1], source: examples[0][2] };
}

export function validateReadmeAttribution(markdown, label) {
  const targets = markdownLinkTargets(markdown);
  for (const href of [
    'https://www.ryanhefner.com',
    'https://commune.software',
  ]) {
    assert.ok(
      hasExactLink(targets, href),
      `${label}: attribution link ${href}`,
    );
  }
}

export function validateSiteUrl(href, manifest, label) {
  const url = new URL(href);
  assert.equal(url.origin, 'https://chakra-docs.dev', label);
  assert.equal(url.username, '', label);
  assert.equal(url.password, '', label);
  const route = url.pathname.replace(/\/+$/, '') || '/';
  if (['/', '/showcase', '/withoss'].includes(route)) {
    assert.equal(url.hash, '', `${label}: no invented site-page fragment`);
    return;
  }
  const page = manifest.byRoute[route];
  assert.ok(page, `${label}: missing route ${route}`);
  if (url.hash) {
    assert.ok(
      page.headings?.some(
        ({ id }) => id === decodeURIComponent(url.hash.slice(1)),
      ),
      `${label}: missing heading ${url.hash}`,
    );
  }
}

async function checkReadmeExamples() {
  const readmes = [
    'README.md',
    'packages/core/README.md',
    'packages/feed/README.md',
  ];
  const cache = path.join(root, '.nx/cache');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'onboarding-'));
  try {
    const sources = new Map(
      readmes.map((readme, index) => {
        const example = extractQuickstart(read(readme), readme);
        return [
          path.join(temporary, `example-${index}.${example.language}`),
          example.source,
        ];
      }),
    );
    const options = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      noUnusedLocals: true,
      skipLibCheck: true,
      esModuleInterop: true,
      noEmitOnError: true,
      types: ['node', 'react'],
    };
    const host = ts.createCompilerHost(options);
    const original = host.getSourceFile.bind(host);
    host.getSourceFile = (filename, languageVersion, onError, fresh) =>
      sources.has(filename)
        ? ts.createSourceFile(
            filename,
            sources.get(filename),
            languageVersion,
            true,
            filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
          )
        : original(filename, languageVersion, onError, fresh);
    host.writeFile = (filename, contents) => {
      assert.equal(path.dirname(filename), temporary);
      assert.ok(filename.endsWith('.js'));
      writeFileSync(filename.replace(/\.js$/, '.mjs'), contents);
    };
    const program = ts.createProgram([...sources.keys()], options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (filename) => filename,
        getNewLine: () => '\n',
      }),
    );
    assert.equal(program.emit().emitSkipped, false);
    const examples = await Promise.all(
      readmes.map(
        (_, index) =>
          import(
            pathToFileURL(path.join(temporary, `example-${index}.mjs`)).href
          ),
      ),
    );

    const dom = new JSDOM(
      renderToStaticMarkup(createElement(examples[0].default)),
    );
    try {
      const document = dom.window.document;
      assert.equal(
        document.querySelectorAll('h1').length,
        1,
        'README owns one page title',
      );
      assert.match(document.querySelector('h1').textContent, /Getting started/);
      assert.equal(
        document.querySelector('#welcome')?.textContent.replace(/\s*#$/, ''),
        'Welcome',
      );
      assert.ok(document.querySelector('a[href="/docs/getting-started"]'));
      assert.match(
        document.body.textContent,
        /Your first documentation page is ready/,
      );
    } finally {
      dom.window.close();
    }
    const core = examples[1];
    assert.ok(core.page);
    assert.equal(core.page, core.samePage);
    assert.equal(core.published.length, 1);
    assert.equal(core.manifest.byRoute['/docs/getting-started'], core.page);
    assert.ok(
      core.manifest.search.some(({ route }) => route === core.page.route),
    );

    const { artifacts } = examples[2];
    for (const [xml, rootElement] of [
      [artifacts.rss, 'rss'],
      [artifacts.atom, 'feed'],
    ]) {
      const xmlDom = new JSDOM(xml, { contentType: 'application/xml' });
      try {
        assert.equal(
          xmlDom.window.document.documentElement.localName,
          rootElement,
        );
      } finally {
        xmlDom.window.close();
      }
    }
    const json = JSON.parse(artifacts.json);
    assert.equal(json.version, 'https://jsonfeed.org/version/1.1');
    assert.equal(json.items.length, 1);
    assert.equal(new URL(json.items[0].url).origin, 'https://example.com');
    console.log(
      `Strictly compiled and exercised actual README examples: ${readmes.join(', ')}`,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export async function checkOnboarding() {
  const { buildFilesystemManifest, defineDocsDiscoveryConfig } =
    await import('@chakra-docs/source-filesystem');
  const manifest = await buildFilesystemManifest({
    config: defineDocsDiscoveryConfig({
      rootDir: path.join(root, 'apps/docs'),
      collections: [
        {
          id: 'docs',
          name: 'Documentation',
          contentPath: 'src/content/docs',
          basePath: '/docs',
        },
      ],
    }),
  });
  const workspace = JSON.parse(read('package.json'));
  const packages = readdirSync(path.join(root, 'packages'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => ({
      directory: name,
      manifest: JSON.parse(read(`packages/${name}/package.json`)),
    }))
    .filter(({ manifest: pkg }) => !pkg.private);
  assert.ok(packages.length >= 12);
  const descriptions = new Set();
  for (const { directory, manifest: pkg } of packages) {
    assert.ok(
      pkg.description?.trim() && pkg.description !== pkg.name,
      pkg.name,
    );
    assert.ok(
      !descriptions.has(pkg.description),
      `${pkg.name}: package-specific description`,
    );
    descriptions.add(pkg.description);
    assert.ok(pkg.keywords.includes('chakra-docs'), pkg.name);
    assert.equal(new Set(pkg.keywords).size, pkg.keywords.length, pkg.name);
    assert.equal(pkg.license, workspace.license, pkg.name);
    assert.deepEqual(pkg.author, workspace.author, pkg.name);
    assert.deepEqual(pkg.contributors, workspace.contributors, pkg.name);
    assert.equal(
      pkg.bugs.url,
      'https://github.com/chakra-docs/chakra-docs/issues',
      pkg.name,
    );
    assert.equal(pkg.repository.directory, `packages/${directory}`, pkg.name);
    validateSiteUrl(pkg.homepage, manifest, pkg.name);
    assert.ok(read(`packages/${directory}/LICENSE`).trim(), pkg.name);
  }
  for (const filename of [
    'README.md',
    ...packages.map(({ directory }) => `packages/${directory}/README.md`),
  ]) {
    const markdown = read(filename);
    validateReadmeAttribution(markdown, filename);
    let canonicalLinks = 0;
    for (const href of markdownLinkTargets(markdown)) {
      if (href.startsWith('#')) continue;
      if (!/^[a-z][a-z\d+.-]*:/i.test(href)) {
        assert.ok(
          existsSync(
            new URL(
              href.split('#')[0],
              pathToFileURL(path.join(root, filename)),
            ),
          ),
          `${filename}: ${href}`,
        );
        continue;
      }
      if (new URL(href).origin !== 'https://chakra-docs.dev') continue;
      canonicalLinks++;
      validateSiteUrl(href, manifest, `${filename}: ${href}`);
    }
    assert.ok(
      canonicalLinks > 0,
      `${filename}: discoverable documentation links`,
    );
  }
  console.log(
    `Validated metadata, documentation routes, and README links for ${packages.length} public packages.`,
  );
  await checkReadmeExamples();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await checkOnboarding();
}
