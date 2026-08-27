export type DocsTabsSyncListener = (value: string) => void;

const values = new Map<string, string>();
const listeners = new Map<string, Set<DocsTabsSyncListener>>();

export function getDocsTabsSyncValue(key: string): string | undefined {
  return values.get(key);
}

export function publishDocsTabsSyncValue(key: string, value: string): void {
  values.set(key, value);
  listeners.get(key)?.forEach((listener) => listener(value));
}

export function subscribeDocsTabsSyncValue(
  key: string,
  listener: DocsTabsSyncListener,
): () => void {
  const keyListeners = listeners.get(key) ?? new Set<DocsTabsSyncListener>();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);

  return () => {
    keyListeners.delete(listener);

    if (keyListeners.size === 0) {
      listeners.delete(key);
    }
  };
}
