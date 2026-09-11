import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const themeDeclaration = readFileSync(
  new URL('../packages/chakra/dist/theme.d.ts', import.meta.url),
  'utf8',
);
const contractDeclaration = readFileSync(
  new URL('../packages/chakra/dist/theme/theme-contract.d.ts', import.meta.url),
  'utf8',
);

const forbiddenDeclarationPatterns = [
  [/from ['"].*\/recipes/, 'recipe module import'],
  [/typeof\s+\w*(?:Recipe|recipe)/, 'recipe-derived public type'],
  [/DeepPartial/, 'recursive DeepPartial helper'],
  [/SystemStyleObject/, 'recursive Chakra style import'],
  [/@chakra-ui\/react/, 'public Chakra declaration import'],
];

for (const [pattern, description] of forbiddenDeclarationPatterns) {
  if (pattern.test(themeDeclaration) || pattern.test(contractDeclaration)) {
    throw new Error(`Chakra Docs theme declarations contain a ${description}.`);
  }
}

const tscPath = fileURLToPath(
  new URL('../node_modules/typescript/bin/tsc', import.meta.url),
);
const fixturePath = fileURLToPath(
  new URL('./fixtures/chakra-theme-types/tsconfig.json', import.meta.url),
);
const result = spawnSync(
  process.execPath,
  [tscPath, '--project', fixturePath, '--extendedDiagnostics'],
  {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: process.env,
  },
);
const diagnostics = `${result.stdout ?? ''}${result.stderr ?? ''}`;

if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(diagnostics);
  throw new Error(`Chakra theme type fixture exited with ${result.status}.`);
}

const instantiationMatch = diagnostics.match(/Instantiations:\s+([\d,]+)/);
if (!instantiationMatch) {
  process.stderr.write(diagnostics);
  throw new Error('TypeScript did not report an instantiation count.');
}

const instantiations = Number(instantiationMatch[1].replaceAll(',', ''));
const maximumInstantiations = 200_000;
if (instantiations > maximumInstantiations) {
  throw new Error(
    `Chakra Docs theme declarations used ${instantiations.toLocaleString()} type instantiations; the budget is ${maximumInstantiations.toLocaleString()}.`,
  );
}

process.stdout.write(
  `Chakra Docs theme declarations verified with ${instantiations.toLocaleString()} type instantiations.\n`,
);
