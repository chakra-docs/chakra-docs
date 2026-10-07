import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkBracesPatch } from './check-braces-patch.mjs';

export const bracesException = Object.freeze({
  id: 'GHSA-vfj7-8cjw-p6xm',
  expires: '2026-11-04T00:00:00.000Z',
});
const severityRanks = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

/** One time-bounded, patched development-only exception; everything else fails. */
export function evaluateAudit(
  report,
  { patchVerified = false, now = new Date() } = {},
) {
  if (
    !report ||
    report.error ||
    !report.metadata?.vulnerabilities ||
    !report.advisories ||
    typeof report.advisories !== 'object' ||
    Array.isArray(report.advisories)
  ) {
    throw new Error('Registry returned an invalid audit report.');
  }
  const accepted = [];
  const blocking = [];
  const counts = { high: 0, critical: 0 };
  for (const advisory of Object.values(report.advisories)) {
    if (!(advisory.severity in severityRanks))
      throw new Error('Registry returned an unknown advisory severity.');
    if (severityRanks[advisory.severity] < severityRanks.high) continue;
    counts[advisory.severity]++;
    if (
      advisory.github_advisory_id === bracesException.id &&
      advisory.module_name === 'braces' &&
      advisory.severity === 'high' &&
      !advisory.patched_versions &&
      patchVerified &&
      now.getTime() < Date.parse(bracesException.expires) &&
      Array.isArray(advisory.findings) &&
      advisory.findings.length > 0 &&
      advisory.findings.every(
        (finding) => finding.version === '3.0.3' && finding.dev === true,
      )
    ) {
      accepted.push(advisory);
    } else blocking.push(advisory);
  }
  for (const severity of ['high', 'critical']) {
    if (report.metadata.vulnerabilities[severity] !== counts[severity]) {
      throw new Error('Registry returned an incomplete audit report.');
    }
  }
  return { accepted, blocking };
}

export function runAudit({ now = new Date() } = {}) {
  // The dependency-review allowlist must expire even if the registry stops
  // returning this advisory while GitHub still reports it.
  if (!(now.getTime() < Date.parse(bracesException.expires))) {
    throw new Error(
      'The temporary braces mitigation has expired; review SECURITY.md and replace it with an upstream fix.',
    );
  }
  const patchVerified = checkBracesPatch();
  // Do not pass --ignore: inspect the unfiltered report, including dev flags.
  const result = spawnSync('pnpm', ['audit', '--json'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || ![0, 1].includes(result.status))
    throw new Error('Dependency audit could not complete.');
  const { accepted, blocking } = evaluateAudit(JSON.parse(result.stdout), {
    patchVerified,
    now,
  });
  for (const advisory of accepted) {
    console.warn(
      `Patched development-only exception: ${advisory.github_advisory_id}; expires ${bracesException.expires}. See SECURITY.md.`,
    );
  }
  for (const advisory of blocking) {
    console.error(
      `${advisory.severity}: ${advisory.module_name} (${advisory.github_advisory_id})`,
    );
  }
  if (blocking.length)
    throw new Error(
      `${blocking.length} unmitigated high/critical dependency advisories.`,
    );
  console.log(
    'Dependency audit passed; all high/critical findings are fixed or explicitly mitigated.',
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    runAudit();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
