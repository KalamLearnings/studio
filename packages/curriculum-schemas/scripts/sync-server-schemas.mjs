#!/usr/bin/env node
/**
 * Copy the backend's activity schemas into src/server, byte for byte
 * (content model CM-S3). Studio runs the server's own write schema and read
 * mapping on what its forms save, so the two can never disagree.
 *
 * Also copies, under test/backend/<backend path>, what Studio's v1 field test
 * needs (CM-B31): the v1 field fixture and its comparison, the v1 delivery
 * (player projection), the save path's v1 display fields (R2), the letters
 * seed and the PROD config shapes fixture.
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

/** The v1 field golden and what it runs on, copied with their backend paths. */
export const GOLDEN_FILES = [
  'tests/golden/v1-fields.json',
  'supabase/seed_letters.sql',
  'supabase/functions/_shared/{tests}/unit/curriculum-schemas/fixtures/prod-activity-shapes.json',
  'supabase/functions/_shared/core/domain/content-audit/v1-fields.ts',
  'supabase/functions/_shared/core/domain/curriculum/player-projection.ts',
  'supabase/functions/_shared/core/domain/curriculum/letter-reference.ts',
  'supabase/functions/_shared/core/domain/curriculum/v1-display.ts',
  'supabase/functions/_shared/core/contracts/curriculum-schemas/harakat.ts',
  'supabase/functions/_shared/core/contracts/curriculum-schemas/madd.ts',
];
const golden = join(pkg, 'test/backend');
rmSync(golden, { recursive: true, force: true });
for (const file of GOLDEN_FILES) {
  const out = join(golden, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, git('show', `dev:${file}`));
}
console.log(`copied ${GOLDEN_FILES.length} v1 golden files to test/backend`);
