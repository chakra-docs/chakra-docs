import type { MaybePromise } from './types.js';

export interface DocsPreferenceOption {
  value: string;
  label?: string;
  disabled?: boolean;
}

export type DocsPreferenceOptionInput = string | DocsPreferenceOption;

export interface DocsPreferenceDefinition {
  id: string;
  label?: string;
  options: readonly DocsPreferenceOptionInput[];
  defaultValue: string;
}

export interface NormalizedDocsPreferenceDefinition {
  id: string;
  label?: string;
  options: readonly DocsPreferenceOption[];
  defaultValue: string;
}

export type DocsPreferenceValues = Readonly<Record<string, string>>;

export interface DocsPreferenceStorage {
  get: (id: string) => MaybePromise<string | null | undefined>;
  set: (id: string, value: string) => MaybePromise<void>;
  remove?: (id: string) => MaybePromise<void>;
}

export type DocsPreferenceChangeSource =
  'selector' | 'tabs' | 'api' | 'storage' | 'reset';

export interface DocsPreferenceChangeEvent {
  id: string;
  value: string;
  previousValue?: string;
  source: DocsPreferenceChangeSource;
}

function requireIdentifier(value: string, name: string): string {
  if (value.length === 0 || value.trim() !== value) {
    throw new Error(`${name} must be a non-empty, trimmed string.`);
  }

  return value;
}

export function normalizeDocsPreferenceDefinition(
  definition: DocsPreferenceDefinition,
): NormalizedDocsPreferenceDefinition {
  const id = requireIdentifier(definition.id, 'Preference id');
  const optionValues = new Set<string>();
  const options = definition.options.map((option) => {
    const normalized =
      typeof option === 'string' ? { value: option } : { ...option };
    const value = requireIdentifier(
      normalized.value,
      `Preference option for "${id}"`,
    );

    if (optionValues.has(value)) {
      throw new Error(`Preference "${id}" has duplicate option "${value}".`);
    }

    optionValues.add(value);
    return { ...normalized, value };
  });

  if (options.length === 0) {
    throw new Error(`Preference "${id}" must define at least one option.`);
  }

  const defaultOption = options.find(
    (option) => option.value === definition.defaultValue,
  );

  if (!defaultOption) {
    throw new Error(
      `Preference "${id}" default value "${definition.defaultValue}" is not an option.`,
    );
  }

  if (defaultOption.disabled) {
    throw new Error(`Preference "${id}" default option cannot be disabled.`);
  }

  return {
    id,
    label: definition.label,
    options,
    defaultValue: definition.defaultValue,
  };
}

export function normalizeDocsPreferenceDefinitions(
  definitions: readonly DocsPreferenceDefinition[],
): readonly NormalizedDocsPreferenceDefinition[] {
  const ids = new Set<string>();

  return definitions.map((definition) => {
    const normalized = normalizeDocsPreferenceDefinition(definition);

    if (ids.has(normalized.id)) {
      throw new Error(`Duplicate preference id "${normalized.id}".`);
    }

    ids.add(normalized.id);
    return normalized;
  });
}

export function resolveDocsPreferenceValue(
  definition: NormalizedDocsPreferenceDefinition,
  candidate?: string | null,
): string {
  return definition.options.some(
    (option) => option.value === candidate && !option.disabled,
  )
    ? (candidate as string)
    : definition.defaultValue;
}

export function resolveDocsPreferenceValues(
  definitions: readonly DocsPreferenceDefinition[],
  candidates: DocsPreferenceValues = {},
): DocsPreferenceValues {
  return Object.fromEntries(
    normalizeDocsPreferenceDefinitions(definitions).map((definition) => [
      definition.id,
      resolveDocsPreferenceValue(definition, candidates[definition.id]),
    ]),
  );
}
