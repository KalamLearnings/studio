/**
 * The word-spelling normaliser stays identical to the backend's (content model
 * CM-B2, CM-S1). `src/spelling.ts` is a byte-for-byte copy of
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/words/spelling.ts
 * so Studio's "this will use the existing word" preview applies the same rule
 * as the server's `saveWord`. To sync, copy the backend file over
 * `src/spelling.ts` unchanged and rebuild the package (`npm run build:schemas`).
 *
 * The backend is read from its `dev` branch (`git show dev:<path>`), else from
 * its working tree. Like the backend's own drift tests, the comparison is
 * skipped with a warning when the sibling backend checkout is absent.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const BACKEND = fileURLToPath(new URL('../../../../kalam-readers-backend/', import.meta.url));
const BACKEND_PATH = 'supabase/functions/_shared/core/domain/words/spelling.ts';
const STUDIO_COPY = fileURLToPath(new URL('../src/spelling.ts', import.meta.url));

function backendSource(): { text: string; from: string } | null {
  if (!existsSync(BACKEND)) return null;
  try {
    const text = execFileSync('git', ['-C', BACKEND, 'show', `dev:${BACKEND_PATH}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { text, from: `kalam-readers-backend dev:${BACKEND_PATH}` };
  } catch {
    const file = BACKEND + BACKEND_PATH;
    return existsSync(file) ? { text: readFileSync(file, 'utf8'), from: file } : null;
  }
}

describe('spelling.ts drift', () => {
  it('imports nothing, so the same source runs under Deno and Node', () => {
    const copy = readFileSync(STUDIO_COPY, 'utf8');
    expect([...copy.matchAll(/^import .*$/gm)]).toHaveLength(0);
    expect(/\bDeno\./.test(copy)).toBe(false);
  });

  it('matches the backend byte for byte', () => {
    const backend = backendSource();
    if (!backend) {
      console.warn(`[spelling-drift] no backend checkout at ${BACKEND}; skipping the comparison.`);
      return;
    }
    expect(
      readFileSync(STUDIO_COPY, 'utf8') === backend.text,
      `src/spelling.ts differs from ${backend.from}. Copy the backend file over it unchanged.`,
    ).toBe(true);
  });
});
