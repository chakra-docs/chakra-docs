import { describe, expect, it } from 'vitest';
import { getDefaultSearchResults } from './default-search-results.js';

const results = Array.from({ length: 10 }, (_, index) => ({
  id: `item-${index}`,
  title: `Item ${index}`,
  route: `/docs/${index}`,
  collectionId: index % 2 ? 'v1' : 'v2',
}));

describe('getDefaultSearchResults', () => {
  it('preserves curated order, filters scope before limiting, and does not mutate inputs', () => {
    const supplied = [results[8], results[1], results[4], results[2]];
    expect(getDefaultSearchResults(supplied, ['v2'], 2)).toEqual([
      results[8],
      results[4],
    ]);
    expect(supplied).toEqual([results[8], results[1], results[4], results[2]]);
    expect(
      getDefaultSearchResults(
        [{ ...results[0], collectionId: undefined }],
        ['v2'],
        6,
      ),
    ).toEqual([]);
  });
  it('removes unsafe routes and duplicate IDs, and bounds the default list', () => {
    expect(
      getDefaultSearchResults(
        [
          { ...results[0], route: 'javascript:alert(1)' },
          ...results,
          results[0],
        ],
        undefined,
        undefined,
      ),
    ).toEqual(results.slice(0, 6));
    expect(
      getDefaultSearchResults([...results, results[0]], undefined, 20),
    ).toEqual(results);
    expect(getDefaultSearchResults(results, undefined, 0)).toEqual([]);
    expect(getDefaultSearchResults(undefined, undefined, 3)).toEqual([]);
  });
});
