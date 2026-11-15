/**
 * Madd on a letter reference (content model D7, CM-B4, CM-S2). `src/madd.ts`
 * is a byte-for-byte copy of
 *   kalam-readers-backend/supabase/functions/_shared/core/contracts/curriculum-schemas/madd.ts
 * so Studio's letter picker and schema apply the same rule as the server:
 * `madd: true` only with fatha, damma or kasra. To sync, copy the backend file
 * over `src/madd.ts` unchanged and rebuild the package (`npm run build:schemas`).
 *
 * The backend is read from its `dev` branch (`git show dev:<path>`), else from
 * its working tree. The comparison is skipped with a warning when the sibling
 * backend checkout (or the file, before CM-B4 is merged) is absent.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LetterReferenceSchema } from '../src/base';
import { HARAKA_IDS } from '../src/harakat';
import { isMaddHaraka, isValidMadd, MADD_NEEDS_SHORT_VOWEL } from '../src/madd';

const BACKEND = fileURLToPath(new URL('../../../../kalam-readers-backend/', import.meta.url));
const BACKEND_PATH = 'supabase/functions/_shared/core/contracts/curriculum-schemas/madd.ts';
const STUDIO_COPY = fileURLToPath(new URL('../src/madd.ts', import.meta.url));

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

describe('madd.ts drift', () => {
  it('imports nothing, so the same source runs under Deno and Node', () => {
    const copy = readFileSync(STUDIO_COPY, 'utf8');
    expect([...copy.matchAll(/^import .*$/gm)]).toHaveLength(0);
    expect(/\bDeno\./.test(copy)).toBe(false);
  });

  it('matches the backend byte for byte', () => {
    const backend = backendSource();
    if (!backend) {
      console.warn(`[madd-drift] no backend madd.ts under ${BACKEND}; skipping the comparison.`);
      return;
    }
    expect(
      readFileSync(STUDIO_COPY, 'utf8') === backend.text,
      `src/madd.ts differs from ${backend.from}. Copy the backend file over it unchanged.`,
    ).toBe(true);
  });
});

describe('LetterReferenceSchema madd', () => {
  const ba = { letterId: 'ba', form: 'isolated' } as const;

  it('keeps madd: true with fatha, damma or kasra', () => {
    for (const haraka of ['fatha', 'damma', 'kasra'] as const) {
      expect(LetterReferenceSchema.parse({ ...ba, haraka, madd: true })).toEqual({ ...ba, haraka, madd: true });
    }
  });

  it('refuses madd: true without a short vowel, on path madd', () => {
    for (const haraka of [undefined, 'none', ...HARAKA_IDS.filter((h) => !isMaddHaraka(h))]) {
      const result = LetterReferenceSchema.safeParse({ ...ba, haraka, madd: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['madd']);
        expect(result.error.issues[0].message).toBe(MADD_NEEDS_SHORT_VOWEL);
      }
    }
  });

  it('accepts absent or false madd with any haraka', () => {
    for (const haraka of [undefined, 'none', ...HARAKA_IDS]) {
      expect(LetterReferenceSchema.safeParse({ ...ba, haraka }).success).toBe(true);
      expect(LetterReferenceSchema.safeParse({ ...ba, haraka, madd: false }).success).toBe(true);
    }
    expect(isValidMadd({ haraka: 'sukoon' })).toBe(true);
  });
});
