import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createMiniSearchEngine } from '../packages/search/dist/minisearch.js';

const recordCount = 5_000;
const queryCount = 200;
const records = Array.from({ length: recordCount }, (_, index) => ({
  id: `docs:${index}`,
  pageId: `docs:${Math.floor(index / 4)}`,
  collectionId: index % 2 === 0 ? 'current' : 'next',
  kind: index % 4 === 0 ? 'page' : 'heading',
  route: `/docs/reference/${index}`,
  title: `Component ${index} configuration`,
  pageTitle: `Component ${Math.floor(index / 4)}`,
  description: `Configure accessible server rendering behavior for component ${index}.`,
  headings: [],
  text: `Installation usage properties examples and troubleshooting for component ${index}.`,
  tags: ['component', index % 2 === 0 ? 'stable' : 'preview'],
}));

const start = performance.now();
const engine = createMiniSearchEngine(records, {
  synonyms: [
    ['a11y', 'accessibility', 'accessible'],
    ['config', 'configuration'],
    ['ssr', 'server rendering', 'server-side rendering'],
  ],
});
const indexDurationMs = performance.now() - start;
const durations = [];

for (let index = 0; index < queryCount; index += 1) {
  const query =
    index % 4 === 0
      ? 'componnt configuration'
      : index % 4 === 1
        ? 'a11y component'
        : index % 4 === 2
          ? 'server render'
          : `component ${index}`;
  const queryStart = performance.now();
  const response = engine.search({ query, collectionIds: ['current'] });
  durations.push(performance.now() - queryStart);
  assert.ok(response.results.length > 0, `No results for ${query}`);
}

durations.sort((left, right) => left - right);
const averageDurationMs =
  durations.reduce((total, value) => total + value, 0) / durations.length;
const p95DurationMs = durations[Math.floor(durations.length * 0.95)] ?? 0;
const maximumIndexDurationMs = 5_000;
const maximumAverageDurationMs = 25;
const maximumP95DurationMs = 75;

assert.ok(
  indexDurationMs <= maximumIndexDurationMs,
  `Search index took ${indexDurationMs.toFixed(1)}ms; budget is ${maximumIndexDurationMs}ms.`,
);
assert.ok(
  averageDurationMs <= maximumAverageDurationMs,
  `Average search took ${averageDurationMs.toFixed(1)}ms; budget is ${maximumAverageDurationMs}ms.`,
);
assert.ok(
  p95DurationMs <= maximumP95DurationMs,
  `p95 search took ${p95DurationMs.toFixed(1)}ms; budget is ${maximumP95DurationMs}ms.`,
);

process.stdout.write(
  `Search performance verified across ${recordCount.toLocaleString()} records: ` +
    `${indexDurationMs.toFixed(1)}ms index, ` +
    `${averageDurationMs.toFixed(2)}ms average, ` +
    `${p95DurationMs.toFixed(2)}ms p95.\n`,
);
