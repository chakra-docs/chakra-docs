import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export const verificationDefaults = {
  timeoutMs: 5 * 60_000,
  requestTimeoutMs: 15_000,
  retryDelayMs: 10_000,
};

// Injectable dependencies let tests simulate propagation without real waiting.
export async function verifyPublishedVersion({
  projects,
  expectedVersion,
  timeoutMs = verificationDefaults.timeoutMs,
  requestTimeoutMs = verificationDefaults.requestTimeoutMs,
  retryDelayMs = verificationDefaults.retryDelayMs,
  fetchImpl = fetch,
  now = () => performance.now(),
  wait = sleep,
  log = (message) => process.stderr.write(`${message}\n`),
}) {
  if (
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(expectedVersion ?? '')
  ) {
    throw new Error('Expected a stable release version to verify.');
  }
  if (
    !Array.isArray(projects) ||
    projects.length === 0 ||
    projects.some((project) => typeof project !== 'string' || !project.trim())
  ) {
    throw new Error('Expected a non-empty list of release packages.');
  }
  for (const value of [timeoutMs, requestTimeoutMs, retryDelayMs]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(
        'Verification timeouts and delays must be positive integers.',
      );
    }
  }

  const started = now();
  const deadline = started + timeoutMs;
  let attempt = 0;
  let failures = [];
  while (now() < deadline) {
    attempt += 1;
    const remaining = Math.max(1, Math.ceil(deadline - now()));
    failures = (
      await Promise.all(
        projects.map((project) =>
          verifyProject(
            project,
            expectedVersion,
            fetchImpl,
            Math.min(requestTimeoutMs, remaining),
          ),
        ),
      )
    ).filter(Boolean);
    if (failures.length === 0) {
      return `Verified ${projects.length} public packages at ${expectedVersion}.`;
    }
    const remainingMs = Math.max(0, deadline - now());
    log(
      `Registry verification attempt ${attempt}: ${projects.length - failures.length}/${projects.length} verified after ${Math.round((now() - started) / 1000)}s.\n` +
        failures.map((failure) => `- ${failure}`).join('\n'),
    );
    if (remainingMs === 0) break;
    const delay = Math.min(
      retryDelayMs * 2 ** (attempt - 1),
      30_000,
      remainingMs,
    );
    log(`Retrying fresh registry metadata in ${Math.ceil(delay / 1000)}s.`);
    await wait(delay);
  }
  throw new Error(
    `Release verification failed after ${attempt} attempt(s) within a ${timeoutMs / 1000}s window:\n` +
      failures.map((failure) => `- ${failure}`).join('\n') +
      '\nPublication may already have succeeded. Re-run verification before retrying publication; do not bump or reuse a version to resolve a visibility delay.',
  );
}

async function verifyProject(project, expectedVersion, fetchImpl, timeoutMs) {
  // No npm subprocess/config/cache or authentication: prove public readability
  // even when run from an authenticated publishing job.
  const url = new URL(
    `https://registry.npmjs.org/${encodeURIComponent(project)}`,
  );
  url.searchParams.set('chakra-docs-verify', randomUUID());
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return `${project}: registry returned HTTP ${response.status}.`;
    }
    const metadata = await response.json();
    if (metadata?.name !== project) {
      return `${project}: registry returned unexpected package metadata.`;
    }
    if (metadata.versions?.[expectedVersion]?.version !== expectedVersion) {
      return `${project}@${expectedVersion} is not publicly readable yet.`;
    }
    if (metadata['dist-tags']?.latest !== expectedVersion) {
      return `${project} has latest=${String(metadata['dist-tags']?.latest)} instead of ${expectedVersion}.`;
    }
    return undefined;
  } catch (error) {
    // Do not echo response bodies or credentials from the publishing environment.
    const reason = ['TimeoutError', 'AbortError'].includes(error?.name)
      ? 'registry request timed out'
      : 'registry request failed or returned invalid JSON';
    return `${project}: ${reason}.`;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const workspaceRoot = path.resolve(import.meta.dirname, '..');
  const nxConfig = JSON.parse(
    await readFile(path.join(workspaceRoot, 'nx.json'), 'utf8'),
  );
  try {
    const result = await verifyPublishedVersion({
      projects: nxConfig.release?.projects,
      expectedVersion: process.argv[2],
    });
    process.stdout.write(`${result}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
