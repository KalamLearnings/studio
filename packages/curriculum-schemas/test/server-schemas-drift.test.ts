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

function backendText(file: string): string {
  return execFileSync('git', ['-C', BACKEND, 'show', `dev:${DIR}/${file}`], {
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
  });
});
