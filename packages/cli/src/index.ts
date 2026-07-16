import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildFilesystemManifest } from '@chakra-docs/source-filesystem';
import { syncGitRepositories } from '@chakra-docs/source-git';
import { toPublicDocsManifest } from '@chakra-docs/core';
import type { DocsDiscoveryConfig, DocsManifest } from '@chakra-docs/core';

export type ChakraDocsCommand =
  'build' | 'dev' | 'validate' | 'inspect' | 'sync';

export interface RunCliOptions {
  argv?: string[];
  cwd?: string;
}

export interface BuildDocsManifestOptions {
  config: DocsDiscoveryConfig;
  syncGit?: boolean;
}

interface ParsedArgs {
  command: ChakraDocsCommand | null;
  configPath?: string;
  outDir?: string;
  pretty?: boolean;
  once?: boolean;
  interval?: number;
}

export async function runCli(options: RunCliOptions = {}): Promise<void> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const args = parseArgs(options.argv ?? process.argv.slice(2));

  if (!args.command) {
    printHelp();
    throw new Error(
      'Expected a chakra-docs command: build, dev, validate, inspect, or sync.',
    );
  }

  const config = await loadDocsConfig(cwd, args.configPath);

  if (args.outDir) {
    config.outDir = args.outDir;
  }

  if (args.command === 'sync') {
    const repositories = await syncGitRepositories(config);
    console.log(JSON.stringify(repositories, null, 2));
    return;
  }

  if (args.command === 'build') {
    const manifest = await buildDocsManifest({ config });
    const outDir = await writeGeneratedManifest(config, manifest, args.pretty);
    console.log(`Chakra Docs manifest written to ${outDir}`);
    return;
  }

  if (args.command === 'validate') {
    const manifest = await buildDocsManifest({ config });
    console.log(
      `Validated ${manifest.pages.length} page(s) across ${manifest.collections.length} collection(s).`,
    );
    return;
  }

  if (args.command === 'inspect') {
    const manifest = await buildDocsManifest({ config });
    console.log(
      JSON.stringify(
        toPublicDocsManifest(manifest),
        null,
        args.pretty === false ? 0 : 2,
      ),
    );
    return;
  }

  await runDev(config, args);
}

export async function buildDocsManifest(
  options: BuildDocsManifestOptions,
): Promise<DocsManifest> {
  if (options.syncGit !== false) {
    await syncGitRepositories(options.config);
  }

  return buildFilesystemManifest({ config: options.config });
}

export async function loadDocsConfig(
  cwd: string,
  configPath = 'chakra-docs.config.json',
): Promise<DocsDiscoveryConfig> {
  const resolvedPath = path.resolve(cwd, configPath);

  if (resolvedPath.endsWith('.json')) {
    const config = JSON.parse(
      await readFile(resolvedPath, 'utf8'),
    ) as DocsDiscoveryConfig;
    return normalizeConfig(cwd, config);
  }

  const imported = (await import(pathToFileURL(resolvedPath).href)) as {
    default?: DocsDiscoveryConfig;
    config?: DocsDiscoveryConfig;
  };

  return normalizeConfig(
    cwd,
    imported.default ?? imported.config ?? (imported as DocsDiscoveryConfig),
  );
}

export async function writeGeneratedManifest(
  config: DocsDiscoveryConfig,
  manifest: DocsManifest,
  pretty = true,
): Promise<string> {
  const outDir = path.resolve(
    config.rootDir,
    config.outDir ?? '.chakra-docs/generated',
  );
  const indent = pretty ? 2 : 0;
  const publicManifest = toPublicDocsManifest(manifest);
  const files = [
    {
      name: 'manifest.json',
      contents: `${JSON.stringify(publicManifest, null, indent)}\n`,
    },
    {
      name: 'manifest.d.ts',
      contents:
        "import type { DocsManifest } from '@chakra-docs/core';\ndeclare const manifest: DocsManifest;\nexport default manifest;\n",
    },
    {
      name: 'index.ts',
      contents:
        "import manifest from './manifest.json' with { type: 'json' };\nexport const docsManifest = manifest;\nexport const allDocs = docsManifest.pages;\nexport const docsNav = docsManifest.nav;\nexport const docsSearch = docsManifest.search;\nexport const docsSitemap = docsManifest.sitemap;\nexport const docsFeeds = docsManifest.feeds;\n",
    },
  ];
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await mkdir(outDir, { recursive: true });

  const stagedFiles = files.map((file) => ({
    ...file,
    finalPath: path.join(outDir, file.name),
    stagedPath: path.join(outDir, `.${file.name}.${token}.tmp`),
  }));

  try {
    await Promise.all(
      stagedFiles.map((file) =>
        writeFile(file.stagedPath, file.contents, {
          encoding: 'utf8',
          flag: 'wx',
        }),
      ),
    );

    for (const file of stagedFiles) {
      await rename(file.stagedPath, file.finalPath);
    }
  } finally {
    await Promise.all(
      stagedFiles.map((file) => rm(file.stagedPath, { force: true })),
    );
  }

  return outDir;
}

async function runDev(
  config: DocsDiscoveryConfig,
  args: ParsedArgs,
): Promise<void> {
  await syncGitRepositories(config);

  const build = async () => {
    const manifest = await buildDocsManifest({ config, syncGit: false });
    const outDir = await writeGeneratedManifest(config, manifest, args.pretty);
    console.log(
      `[chakra-docs] built ${manifest.pages.length} page(s) into ${outDir} at ${new Date().toISOString()}`,
    );
  };

  await build();

  if (args.once) {
    return;
  }

  const interval = args.interval ?? 1000;
  let running = false;

  setInterval(() => {
    if (running) {
      return;
    }

    running = true;
    build()
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[chakra-docs] ${message}`);
      })
      .finally(() => {
        running = false;
      });
  }, interval);
}

function parseArgs(argv: string[]): ParsedArgs {
  const [commandInput, ...rest] = argv;
  const command = parseCommand(commandInput);
  const parsed: ParsedArgs = { command };
  const seen = new Set<string>();

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--config' || arg === '-c') {
      assertFlagNotRepeated(seen, '--config');
      parsed.configPath = readFlagValue(rest, index, arg);
      index += 1;
    } else if (arg === '--out-dir') {
      assertFlagNotRepeated(seen, arg);
      parsed.outDir = readFlagValue(rest, index, arg);
      index += 1;
    } else if (arg === '--pretty') {
      assertFlagNotRepeated(seen, arg);

      if (seen.has('--compact')) {
        throw new Error(
          'Options --pretty and --compact cannot be used together.',
        );
      }

      parsed.pretty = true;
    } else if (arg === '--compact') {
      assertFlagNotRepeated(seen, arg);

      if (seen.has('--pretty')) {
        throw new Error(
          'Options --pretty and --compact cannot be used together.',
        );
      }

      parsed.pretty = false;
    } else if (arg === '--once') {
      assertFlagNotRepeated(seen, arg);
      parsed.once = true;
    } else if (arg === '--interval') {
      assertFlagNotRepeated(seen, arg);
      const input = readFlagValue(rest, index, arg);
      const interval = Number(input);

      if (!Number.isFinite(interval) || interval <= 0) {
        throw new Error(
          `Invalid --interval value "${input}": expected a positive number of milliseconds.`,
        );
      }

      parsed.interval = interval;
      index += 1;
    } else {
      throw new Error(`Unknown option or argument "${arg}".`);
    }
  }

  validateCommandFlags(parsed, seen);
  return parsed;
}

function assertFlagNotRepeated(seen: Set<string>, flag: string): void {
  if (seen.has(flag)) {
    throw new Error(`Option ${flag} may only be specified once.`);
  }

  seen.add(flag);
}

function readFlagValue(rest: string[], index: number, flag: string): string {
  const value = rest[index + 1];

  if (value === undefined || (flag !== '--interval' && value.startsWith('-'))) {
    throw new Error(`Option ${flag} requires a value.`);
  }

  return value;
}

function validateCommandFlags(parsed: ParsedArgs, seen: Set<string>): void {
  if (!parsed.command) {
    return;
  }

  if (
    parsed.command !== 'dev' &&
    (seen.has('--once') || seen.has('--interval'))
  ) {
    throw new Error(
      'Options --once and --interval are only valid for the dev command.',
    );
  }

  if (
    parsed.command !== 'build' &&
    parsed.command !== 'dev' &&
    seen.has('--out-dir')
  ) {
    throw new Error(
      'Option --out-dir is only valid for build and dev commands.',
    );
  }

  if (
    parsed.command !== 'build' &&
    parsed.command !== 'dev' &&
    parsed.command !== 'inspect' &&
    (seen.has('--pretty') || seen.has('--compact'))
  ) {
    throw new Error(
      'Options --pretty and --compact are only valid for build, dev, and inspect commands.',
    );
  }
}

function parseCommand(command: string | undefined): ChakraDocsCommand | null {
  if (
    command === 'build' ||
    command === 'dev' ||
    command === 'validate' ||
    command === 'inspect' ||
    command === 'sync'
  ) {
    return command;
  }

  return null;
}

function normalizeConfig(
  cwd: string,
  config: DocsDiscoveryConfig,
): DocsDiscoveryConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid Chakra Docs config: expected an object.');
  }

  if (typeof config.rootDir !== 'string' || config.rootDir.length === 0) {
    throw new Error(
      'Invalid Chakra Docs config: rootDir must be a non-empty string.',
    );
  }

  if (!Array.isArray(config.collections)) {
    throw new Error(
      'Invalid Chakra Docs config: collections must be an array.',
    );
  }

  return {
    ...config,
    rootDir: path.resolve(cwd, config.rootDir),
  };
}

function printHelp(): void {
  console.error(`Usage: chakra-docs <command> [options]

Commands:
  build      Build and write a generated manifest
  dev        Rebuild the generated manifest on an interval
  validate   Validate configured collections
  inspect    Print the manifest JSON to stdout
  sync       Sync configured Git repositories

Options:
  -c, --config <path>   Config file path, defaults to chakra-docs.config.json
  --out-dir <path>      Generated output directory
  --pretty              Pretty-print generated JSON
  --compact             Compact generated JSON
  --once                Run dev once and exit
  --interval <ms>       Rebuild interval for dev in milliseconds, defaults to 1000
`);
}
