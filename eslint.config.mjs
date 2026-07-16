import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'layer:core',
              onlyDependOnLibsWithTags: ['layer:core'],
            },
            {
              sourceTag: 'layer:source',
              onlyDependOnLibsWithTags: ['layer:core', 'layer:source'],
            },
            {
              sourceTag: 'layer:ui',
              onlyDependOnLibsWithTags: ['layer:core', 'layer:ui'],
            },
            {
              sourceTag: 'layer:cli',
              onlyDependOnLibsWithTags: [
                'layer:core',
                'layer:source',
                'layer:cli',
              ],
            },
            {
              sourceTag: 'layer:adapter',
              onlyDependOnLibsWithTags: [
                'layer:core',
                'layer:ui',
                'layer:source',
                'layer:adapter',
                'layer:integration',
              ],
            },
            {
              sourceTag: 'layer:integration',
              onlyDependOnLibsWithTags: [
                'layer:core',
                'layer:ui',
                'layer:integration',
              ],
            },
            {
              sourceTag: 'layer:app',
              onlyDependOnLibsWithTags: [
                'layer:core',
                'layer:ui',
                'layer:source',
                'layer:adapter',
                'layer:integration',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
