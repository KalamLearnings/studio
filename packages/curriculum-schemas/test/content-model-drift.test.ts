/**
 * The content-model vocabularies stay identical to the backend's (content model
 * CM-B3, CM-B19). These five files are byte-for-byte copies of
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/content-model/
 * rules.ts (rule ids, rulesFromUnits), skills.ts (skill kinds, strands, response
 * types, the activity type map), contrast.ts (distractor error tags and their
 * derivation), skill_graph.ts (prerequisite and child_of links) and
 * teaching_sequences.ts (stage orders). The curriculum lead reviews them
 * (CM-C7); change them in the backend by pull request, then copy them here with
 * the backend's `scripts/sync-content-model.ts` and rebuild the package
 * (`npm run build:schemas`). Never edit the copies here.
 *
 * The backend is read from its `dev` branch (`git show dev:<path>`), else from
 * its working tree. Like the backend's own drift tests, the comparison is
 * skipped with a warning when the sibling backend checkout or file is absent.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTRAST_IDS, RULE_IDS, SKILL_KINDS, SKILL_LINKS, STAGE_LABELS } from '../src/index';

const BACKEND = fileURLToPath(new URL('../../../../kalam-readers-backend/', import.meta.url));
const BACKEND_DIR = 'supabase/functions/_shared/core/domain/content-model/';
const FILES = ['rules.ts', 'skills.ts', 'contrast.ts', 'skill_graph.ts', 'teaching_sequences.ts'];

function studioCopy(file: string): string {
  return readFileSync(fileURLToPath(new URL(`../src/${file}`, import.meta.url)), 'utf8');
}

function backendSource(file: string): { text: string; from: string } | null {
  if (!existsSync(BACKEND)) return null;
  const path = BACKEND_DIR + file;
  try {
    const text = execFileSync('git', ['-C', BACKEND, 'show', `dev:${path}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { text, from: `kalam-readers-backend dev:${path}` };
  } catch {
    const full = BACKEND + path;
    return existsSync(full) ? { text: readFileSync(full, 'utf8'), from: full } : null;
  }
}

describe('content-model vocabularies drift', () => {
  it('are exported from the package', () => {
    expect(RULE_IDS).toContain('tanween_damm');
    expect(SKILL_KINDS).toContain('decode');
    expect(CONTRAST_IDS).toContain('dots');
    expect(SKILL_LINKS.length).toBeGreaterThan(0);
    expect(STAGE_LABELS).toContain('sukoon');
  });

  it.each(FILES)('%s imports nothing, so the same source runs under Deno and Node', (file) => {
    const copy = studioCopy(file);
    expect([...copy.matchAll(/^\s*(import|export .* from) /gm)]).toHaveLength(0);
    expect(/\bDeno\./.test(copy)).toBe(false);
  });

  it.each(FILES)('%s matches the backend byte for byte', (file) => {
    const backend = backendSource(file);
    if (!backend) {
      console.warn(`[content-model-drift] no backend ${file} at ${BACKEND}; skipping the comparison.`);
      return;
    }
    expect(
      studioCopy(file) === backend.text,
      `src/${file} differs from ${backend.from}. Run the backend's scripts/sync-content-model.ts.`,
    ).toBe(true);
  });
});
