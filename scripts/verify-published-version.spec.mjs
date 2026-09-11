import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  verifyPublishedVersion,
  verificationDefaults,
} from './verify-published-version.mjs';

const project = '@chakra-docs/shiki';
const version = '0.2.0';
const published = (name = project, latest = version) => ({
  name,
  versions: { [version]: { version } },
  'dist-tags': { latest },
});

function harness(fetchImpl, overrides = {}) {
  let elapsed = 0;
  const delays = [];
  const logs = [];
  const requests = [];
  const run = () =>
    verifyPublishedVersion({
      projects: [project],
      expectedVersion: version,
      now: () => elapsed,
      wait: async (ms) => {
        delays.push(ms);
        elapsed += ms;
      },
      log: (message) => logs.push(message),
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return fetchImpl(url, options, requests.length);
      },
      ...overrides,
    });
  return { run, delays, logs, requests, elapsed: () => elapsed };
}

test('checks public version and latest in one fresh anonymous request', async () => {
  const h = harness(() => Response.json(published()));
  assert.equal(await h.run(), 'Verified 1 public packages at 0.2.0.');
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.delays, []);
  const { url, options } = h.requests[0];
  assert.equal(url.origin, 'https://registry.npmjs.org');
  assert.equal(decodeURIComponent(url.pathname), `/${project}`);
  assert.ok(url.searchParams.get('chakra-docs-verify'));
  assert.equal(options.cache, 'no-store');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error');
  assert.equal(
    options.headers['Cache-Control'],
    'no-cache, no-store, max-age=0',
  );
  assert.equal(options.headers.Pragma, 'no-cache');
  assert.equal(options.headers.Authorization, undefined);
  assert.ok(options.signal instanceof AbortSignal);
});

test('recovers from 404, missing version and stale latest with unique requests', async () => {
  const replies = [
    () => new Response(null, { status: 404 }),
    () =>
      Response.json({
        name: project,
        versions: {},
        'dist-tags': { latest: '0.1.0' },
      }),
    () => Response.json(published(project, '0.1.0')),
    () => Response.json(published()),
  ];
  const h = harness(() => replies.shift()());
  await h.run();
  assert.deepEqual(h.delays, [10_000, 20_000, 30_000]);
  assert.equal(new Set(h.requests.map(({ url }) => url.href)).size, 4);
  assert.match(h.logs.join('\n'), /HTTP 404/);
  assert.match(h.logs.join('\n'), /not publicly readable yet/);
  assert.match(h.logs.join('\n'), /latest=0.1.0/);
});

for (const [label, reply] of [
  ['HTTP 429', () => new Response(null, { status: 429 })],
  ['HTTP 503', () => new Response(null, { status: 503 })],
  [
    'network error',
    () => {
      throw new Error('private response content');
    },
  ],
  ['invalid JSON', () => new Response('private response content')],
  ['wrong package', () => Response.json(published('@chakra-docs/core'))],
  [
    'wrong version record',
    () =>
      Response.json({
        ...published(),
        versions: { [version]: { version: '0.1.0' } },
      }),
  ],
]) {
  test(`retries ${label} without logging response content`, async () => {
    const h = harness((url, options, call) =>
      call === 1 ? reply() : Response.json(published()),
    );
    await h.run();
    assert.equal(h.requests.length, 2);
    assert.doesNotMatch(h.logs.join('\n'), /private response content/);
  });
}

test('permanent failures stop after the five-minute budget with recovery guidance', async () => {
  const h = harness(() => new Response(null, { status: 404 }));
  await assert.rejects(
    h.run(),
    /Release verification failed.*\n[\s\S]*shiki[\s\S]*Re-run verification before retrying publication/,
  );
  assert.equal(verificationDefaults.timeoutMs, 300_000);
  assert.equal(verificationDefaults.requestTimeoutMs, 15_000);
  assert.equal(h.elapsed(), 300_000);
  assert.equal(h.requests.length, 11);
  assert.deepEqual(h.delays, [10_000, 20_000, ...Array(9).fill(30_000)]);
});

test('does not accept an existing version with an incorrect latest tag', async () => {
  const h = harness(() => Response.json(published(project, '0.1.0')), {
    timeoutMs: 1,
  });
  await assert.rejects(h.run(), /latest=0.1.0 instead of 0.2.0/);
});

test('rechecks previously visible packages instead of retaining stale successes', async () => {
  const other = '@chakra-docs/core';
  const h = harness(
    (url, options, call) => {
      const name = decodeURIComponent(url.pathname.slice(1));
      const round = Math.ceil(call / 2);
      if (
        (round === 1 && name === other) ||
        (round === 2 && name === project)
      ) {
        return new Response(null, { status: 404 });
      }
      return Response.json(published(name));
    },
    { projects: [project, other] },
  );
  assert.equal(await h.run(), 'Verified 2 public packages at 0.2.0.');
  assert.equal(h.requests.length, 6);
});

test('aborts stalled requests within the remaining overall deadline', async () => {
  let aborted = false;
  const logs = [];
  await assert.rejects(
    verifyPublishedVersion({
      projects: [project],
      expectedVersion: version,
      timeoutMs: 30,
      requestTimeoutMs: 15_000,
      log: (message) => logs.push(message),
      fetchImpl: (url, { signal }) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error('timeout was not enforced')),
            1000,
          );
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              aborted = true;
              reject(signal.reason);
            },
            { once: true },
          );
        }),
    }),
    /registry request timed out/,
  );
  assert.equal(aborted, true);
});

test('rejects empty inventories and invalid inputs before requesting npm', async () => {
  for (const overrides of [
    { projects: [] },
    { projects: undefined },
    { projects: [''] },
    { expectedVersion: 'latest' },
    { expectedVersion: '0.2.0-beta.1' },
    { timeoutMs: 0 },
    { requestTimeoutMs: -1 },
    { retryDelayMs: NaN },
  ]) {
    const h = harness(() => assert.fail('must not fetch'), overrides);
    await assert.rejects(h.run(), /Expected|positive integers/);
    assert.equal(h.requests.length, 0);
  }
});

test('CLI invalid input exits nonzero without contacting npm', () => {
  const result = spawnSync(
    process.execPath,
    [
      new URL('./verify-published-version.mjs', import.meta.url).pathname,
      'latest',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Expected a stable release version/);
  assert.equal(result.stdout, '');
});
