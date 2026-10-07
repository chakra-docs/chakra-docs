import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateAudit,
  bracesException,
  runAudit,
} from './audit-dependencies.mjs';
import { checkBracesPatch } from './check-braces-patch.mjs';

const advisory = {
  github_advisory_id: bracesException.id,
  module_name: 'braces',
  severity: 'high',
  patched_versions: null,
  findings: [{ version: '3.0.3', dev: true }],
};
const report = (value = advisory) => ({
  advisories: { one: value },
  metadata: {
    vulnerabilities: {
      high: value.severity === 'high' ? 1 : 0,
      critical: value.severity === 'critical' ? 1 : 0,
    },
  },
});
const options = { patchVerified: true, now: new Date('2026-10-04T00:00:00Z') };

test('the installed braces patch rejects deep strings, ASTs and cycles while retaining normal glob behavior', () => {
  assert.equal(checkBracesPatch(), true);
});

test('only the verified, unfixable development advisory can be accepted', () => {
  assert.deepEqual(evaluateAudit(report(), options), {
    accepted: [advisory],
    blocking: [],
  });
  assert.equal(
    evaluateAudit(report(), { ...options, patchVerified: false }).blocking
      .length,
    1,
  );
  for (const changes of [
    { github_advisory_id: 'GHSA-other' },
    { module_name: 'another-package' },
    { severity: 'critical' },
    { patched_versions: '>=3.0.4' },
    { findings: [] },
    { findings: [{ version: '3.0.4', dev: true }] },
    { findings: [{ version: '3.0.3', dev: false }] },
    { findings: [{ version: '3.0.3' }] },
    { findings: [...advisory.findings, { version: '3.0.3', dev: false }] },
  ])
    assert.equal(
      evaluateAudit(report({ ...advisory, ...changes }), options).blocking
        .length,
      1,
    );
});

test('the exception expires and cannot hide other audit failures', () => {
  assert.equal(
    evaluateAudit(report(), {
      ...options,
      now: new Date(bracesException.expires),
    }).blocking.length,
    1,
  );
  const other = {
    ...advisory,
    github_advisory_id: 'GHSA-new',
    module_name: 'next',
  };
  const combined = {
    ...report(),
    advisories: { one: advisory, two: other },
    metadata: { vulnerabilities: { high: 2, critical: 0 } },
  };
  assert.deepEqual(evaluateAudit(combined, options), {
    accepted: [advisory],
    blocking: [other],
  });
  for (const invalid of [
    null,
    {},
    { advisories: {} },
    { ...report(), error: 'network error' },
  ]) {
    assert.throws(
      () => evaluateAudit(invalid, options),
      /invalid audit report/,
    );
  }
  assert.throws(
    () => evaluateAudit(report({ ...advisory, severity: 'unknown' }), options),
    /unknown advisory severity/,
  );
  assert.throws(
    () => evaluateAudit({ ...report(), advisories: {} }, options),
    /incomplete audit report/,
  );
});

test('the CLI mitigation gate expires before installation or registry checks, even without an advisory response', () => {
  for (const now of [
    new Date(bracesException.expires),
    new Date('2026-12-01T00:00:00Z'),
    new Date('invalid'),
  ]) {
    assert.throws(
      () => runAudit({ now }),
      /temporary braces mitigation has expired/,
    );
  }
});
