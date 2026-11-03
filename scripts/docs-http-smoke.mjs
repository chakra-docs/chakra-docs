import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { discoveryLinkTargets, hasExactLink } from './documentation-links.mjs';

const app = new URL('../apps/docs/', import.meta.url);
const require = createRequire(new URL('package.json', app));
const socket = createServer();
socket.listen(0, '127.0.0.1');
await once(socket, 'listening');
const { port } = socket.address();
await new Promise((resolve, reject) =>
  socket.close((error) => (error ? reject(error) : resolve())),
);
const server = spawn(
  process.execPath,
  [
    require.resolve('next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    cwd: fileURLToPath(app),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://chakra-docs.dev',
      CHAKRA_DOCS_REQUIRE_SITE_URL: 'true',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let log = '';
for (const stream of [server.stdout, server.stderr])
  stream.on('data', (chunk) => {
    log = (log + chunk).slice(-8000);
  });
const request = (route, options) =>
  fetch(`http://127.0.0.1:${port}${route}`, {
    ...options,
    signal: AbortSignal.timeout(10_000),
  });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error('Next production server exited before becoming ready.');
    try {
      ready = (await request('/api/health')).ok;
    } catch {
      /* Wait for the local listener. */
    }
    if (ready) break;
    await delay(150);
  }
  assert.ok(ready, 'Next production server must start');
  for (const route of [
    '/',
    '/docs',
    '/docs/app-router',
    '/docs/astro',
    '/docs/cli',
    '/docs/feed',
    '/docs/react-router',
    '/docs/source-git',
    '/showcase',
    '/withoss',
  ]) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    const dom = new JSDOM(await response.text());
    try {
      const document = dom.window.document;
      assert.equal(document.querySelectorAll('main').length, 1, route);
      assert.equal(document.querySelectorAll('h1').length, 1, route);
      assert.equal(
        document.querySelectorAll('link[rel="canonical"]').length,
        1,
        route,
      );
      assert.equal(
        document.querySelector('link[rel="canonical"]').href,
        `https://chakra-docs.dev${route}`,
      );
      const structured = document.querySelectorAll(
        'script#page-structured-data[type="application/ld+json"]',
      );
      assert.equal(structured.length, 1, route);
      assert.equal(
        JSON.parse(structured[0].textContent)['@context'],
        'https://schema.org',
      );
      if (route.startsWith('/docs/'))
        assert.ok(
          document.querySelector('h2'),
          'Markdown headings must be in HTML before JavaScript',
        );
    } finally {
      dom.window.close();
    }
  }
  for (const file of [
    'robots.txt',
    'sitemap.xml',
    'llms.txt',
    'llms-full.txt',
  ]) {
    const response = await request('/' + file);
    assert.equal(response.status, 200, file);
    assert.match(
      response.headers.get('content-type'),
      file === 'sitemap.xml' ? /(?:application|text)\/xml/ : /text\/plain/,
      file,
    );
    const text = await response.text();
    assert.ok(text.length > 50, file);
    if (file !== 'robots.txt')
      assert.ok(
        hasExactLink(
          discoveryLinkTargets(text, file),
          'https://chakra-docs.dev/docs/app-router',
        ),
        file,
      );
    const head = await request('/' + file, { method: 'HEAD' });
    assert.equal(head.status, 200, file);
    assert.equal(await head.text(), '', file);
  }
  assert.equal((await (await request('/api/health')).json()).status, 'ok');
  const search = await request('/api/docs/search?q=cli&limit=20');
  assert.equal(search.status, 200);
  const { results } = await search.json();
  assert.ok(results.length > 0 && results.length <= 20);
  assert.ok(results.some(({ route }) => route === '/docs/cli'));
  assert.ok(
    results.every((result) => !('body' in result) && !('text' in result)),
  );
  assert.equal(
    (await request('/api/docs/search?q=' + 'x'.repeat(201))).status,
    400,
  );
  assert.equal(
    (await request('/api/docs/search', { method: 'POST' })).status,
    405,
  );
  for (const route of ['/missing-page', '/docs/missing-page']) {
    const response = await request(route);
    assert.equal(response.status, 404, route);
  }
  console.log(
    'Docs production HTTP smoke passed: public guides, canonical metadata, JSON-LD, crawler GET/HEAD, bounded API search, health, and real 404s.',
  );
} catch (error) {
  console.error(log);
  throw error;
} finally {
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'exit');
}
