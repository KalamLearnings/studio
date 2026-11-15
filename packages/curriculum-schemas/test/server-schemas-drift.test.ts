/**
 * The server's activity schemas stay identical to the backend's (content model
 * CM-S3). `src/server/` is a byte-for-byte copy of
 *   kalam-readers-backend/supabase/functions/_shared/core/contracts/curriculum-schemas/
 * so Studio runs the server's own write schemas (what a save must send) and
 * read schemas (the legacy-to-canonical mapping) on what its forms save.
 * Change them in the backend by pull request, then run
 * `node packages/curriculum-schemas/scripts/sync-server-schemas.mjs` and
 * rebuild the package (`npm run build:schemas`). Never edit the copies here.
 *
 * The v1 field golden files Studio's `lib/activityConfig/v1Fields.test.ts`
 * runs on (CM-B31: fixture, comparison, delivery, letters seed, PROD config
 * shapes) are copied the same way under `test/backend/<backend path>`.
 *
 * The backend is read from its `dev` branch. Like the other drift tests, the
 * comparison is skipped with a warning when the sibling backend checkout is
 * absent.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getActivityConfigSchema, readActivityConfig } from '../src/server/index.ts';

const BACKEND = fileURLToPath(new URL('../../../../kalam-readers-backend/', import.meta.url));
const DIR = 'supabase/functions/_shared/core/contracts/curriculum-schemas';
/** Kept in step with GOLDEN_FILES in scripts/sync-server-schemas.mjs. */
const GOLDEN_FILES = [
  'tests/golden/v1-fields.json',
  'supabase/seed_letters.sql',
  'supabase/functions/_shared/{tests}/unit/curriculum-schemas/fixtures/prod-activity-shapes.json',
  'supabase/functions/_shared/core/domain/content-audit/v1-fields.ts',
  'supabase/functions/_shared/core/domain/curriculum/player-projection.ts',
  'supabase/functions/_shared/core/domain/curriculum/letter-reference.ts',
  'supabase/functions/_shared/core/contracts/curriculum-schemas/harakat.ts',
];
const COPY = fileURLToPath(new URL('../src/server/', import.meta.url));

function copyFiles(dir = COPY): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? copyFiles(path) : [relative(COPY, path)];
  }).sort();
}

function backendFiles(): string[] | null {
  if (!existsSync(BACKEND)) return null;
  try {
    return execFileSync('git', ['-C', BACKEND, 'ls-tree', '-r', '--name-only', 'dev', '--', DIR], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).split('\n').filter(Boolean).map((p) => p.slice(DIR.length + 1)).sort();
  } catch {
    return null;
  }
}

function backendText(file: string, dir = DIR): string {
  return execFileSync('git', ['-C', BACKEND, 'show', `dev:${dir ? `${dir}/` : ''}${file}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

describe('server activity schemas drift', () => {
  it('run here: the write and read schemas load', () => {
    const ref = { letterId: 'ba', form: 'isolated' };
    expect(getActivityConfigSchema('grid_tap').safeParse({ targetLetter: ref }).success).toBe(true);
    expect(readActivityConfig('trace_letter', { letterForm: 'ب' })).toEqual({
      success: true,
      config: { targetLetter: ref },
    });
  });

  it('hold the same files as the backend', () => {
    const files = backendFiles();
    if (!files) {
      console.warn(`[server-schemas-drift] no backend checkout at ${BACKEND}; skipping the comparison.`);
      return;
    }
    expect(copyFiles()).toEqual(files);
  });

  it('match the backend byte for byte', () => {
    const files = backendFiles();
    if (!files) return;
    const differ = files.filter((f) => {
      const copy = join(COPY, f);
      return !existsSync(copy) || readFileSync(copy, 'utf8') !== backendText(f);
    });
    expect(
      differ,
      `src/server differs from kalam-readers-backend dev:${DIR}. Run scripts/sync-server-schemas.mjs.`,
    ).toEqual([]);
  }, 60_000);

  it('the v1 golden copies match the backend byte for byte', () => {
    if (!backendFiles()) return;
    const golden = fileURLToPath(new URL('./backend/', import.meta.url));
    const differ = GOLDEN_FILES.filter((f) => {
      const copy = join(golden, f);
      return !existsSync(copy) || readFileSync(copy, 'utf8') !== backendText(f, '');
    });
    expect(differ, 'test/backend differs from kalam-readers-backend dev. Run scripts/sync-server-schemas.mjs.').toEqual([]);
  }, 60_000);
});
