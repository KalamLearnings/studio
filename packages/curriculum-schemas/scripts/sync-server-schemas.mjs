#!/usr/bin/env node
/**
 * Copy the backend's activity schemas into src/server, byte for byte
 * (content model CM-S3). Studio runs the server's own write schema and read
 * mapping on what its forms save, so the two can never disagree.
 *
 *   node packages/curriculum-schemas/scripts/sync-server-schemas.mjs [<backend checkout>]
 *
 * The backend checkout defaults to ../kalam-readers-backend beside the Studio
 * checkout. Files are read from its `dev` branch. Never edit src/server by
 * hand: change the backend by pull request, sync, then rebuild the package
 * (`npm run build:schemas`). `test/server-schemas-drift.test.ts` fails when
 * the copies differ.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const backend = resolve(process.argv[2] ?? resolve(pkg, '../../../kalam-readers-backend'));
const DIR = 'supabase/functions/_shared/core/contracts/curriculum-schemas';
const target = join(pkg, 'src/server');

const git = (...args) => execFileSync('git', ['-C', backend, ...args], { encoding: 'utf8' });

const files = git('ls-tree', '-r', '--name-only', 'dev', '--', DIR)
  .split('\n')
  .filter(Boolean)
  .map((path) => path.slice(DIR.length + 1));

rmSync(target, { recursive: true, force: true });
for (const file of files) {
  const out = join(target, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, git('show', `dev:${DIR}/${file}`));
}
console.log(`copied ${files.length} files from ${backend} dev:${DIR}`);
