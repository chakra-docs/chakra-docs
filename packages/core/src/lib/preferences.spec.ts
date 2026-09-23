import { describe, expect, it } from 'vitest';
import {
  normalizeDocsPreferenceDefinition,
  normalizeDocsPreferenceDefinitions,
  resolveDocsPreferenceValue,
  resolveDocsPreferenceValues,
} from './preferences.js';

const packageManager = {
  id: 'package-manager',
  label: 'Package manager',
  options: ['npm', { value: 'pnpm', label: 'pnpm' }, 'yarn'],
  defaultValue: 'npm',
} as const;

describe('documentation preferences', () => {
  it('normalizes shorthand options without mutating their labels', () => {
    expect(normalizeDocsPreferenceDefinition(packageManager)).toEqual({
      ...packageManager,
      options: [
        { value: 'npm' },
        { value: 'pnpm', label: 'pnpm' },
        { value: 'yarn' },
      ],
    });
  });

  it('accepts valid values and falls back for unknown or disabled values', () => {
    const definition = normalizeDocsPreferenceDefinition({
      ...packageManager,
      options: [...packageManager.options, { value: 'bun', disabled: true }],
    });

    expect(resolveDocsPreferenceValue(definition, 'pnpm')).toBe('pnpm');
    expect(resolveDocsPreferenceValue(definition, 'bun')).toBe('npm');
    expect(resolveDocsPreferenceValue(definition, 'unknown')).toBe('npm');
    expect(resolveDocsPreferenceValue(definition, null)).toBe('npm');
  });

  it('resolves only declared dimensions into a complete value record', () => {
    expect(
      resolveDocsPreferenceValues(
        [
          packageManager,
          {
            id: 'api-style',
            options: ['rest', 'graphql'],
            defaultValue: 'rest',
          },
        ],
        {
          'package-manager': 'yarn',
          'api-style': 'invalid',
          unknown: 'ignored',
        },
      ),
    ).toEqual({ 'package-manager': 'yarn', 'api-style': 'rest' });
  });

  it.each([
    [{ ...packageManager, id: '' }, 'Preference id'],
    [{ ...packageManager, id: ' package-manager' }, 'Preference id'],
    [{ ...packageManager, options: [] }, 'at least one option'],
    [{ ...packageManager, options: ['npm', 'npm'] }, 'duplicate option'],
    [{ ...packageManager, defaultValue: 'bun' }, 'is not an option'],
    [
      {
        ...packageManager,
        options: [{ value: 'npm', disabled: true }, 'pnpm'],
      },
      'cannot be disabled',
    ],
  ] as const)('rejects an invalid definition %#', (definition, message) => {
    expect(() => normalizeDocsPreferenceDefinition(definition)).toThrow(
      message,
    );
  });

  it('rejects duplicate preference dimensions', () => {
    expect(() =>
      normalizeDocsPreferenceDefinitions([packageManager, packageManager]),
    ).toThrow('Duplicate preference id');
  });
});
