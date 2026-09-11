/** Analytics are observers: integration failures must not break the UI. */
export function emitAnalytics<Args extends unknown[]>(
  callback: ((...args: Args) => unknown) | undefined,
  ...args: Args
): void {
  try {
    void Promise.resolve(callback?.(...args)).catch(() => undefined);
  } catch {
    // Applications can report integration errors inside their own callbacks.
  }
}
