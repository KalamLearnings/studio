/**
 * Pure rules for the word family editor (CM-S5), kept in step with
 * `kalam-readers-backend` `core/domain/words/family.ts` and
 * `core/domain/content-audit/{arabic,word-classes}.ts`. The backend decides;
 * these only let the editor offer the right choices and explain a refusal in
 * plain words.
 */

import type { CuratedWord } from '@/lib/types/wordFamilies';

const FAMILY_SLUG_MAX = 64;
const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** A family or concept id: lowercase letters and digits joined by single `-` or `_`. */
export function isSlug(value: string): boolean {
  return value.length <= FAMILY_SLUG_MAX && SLUG.test(value);
}

/** A slug proposal from an English gloss (`"Book (n.)"` gives `book-n`); null when nothing is left. */
export function slugFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, FAMILY_SLUG_MAX)
    .replace(/-+$/g, '');
  return slug && isSlug(slug) ? slug : null;
}

// ---- Arabic letters and marks (the audit's classes) -----------------------------

const FATHA = 'َ';
const DAMMA = 'ُ';
const KASRA = 'ِ';
const SHORT_VOWELS = new Set([FATHA, DAMMA, KASRA]);
const TANWEEN = new Set(['ً', 'ٌ', 'ٍ']);
const SHADDA = 'ّ';
const SUKUN = 'ْ';
const OTHER_MARKS = new Set(['ٰ', 'ٕ', 'ٓ', 'ٔ']);

function isBaseLetter(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    ch.length === 1 &&
    ((c >= 0x0621 && c <= 0x063a) || (c >= 0x0641 && c <= 0x064a) || c === 0x0671)
  );
}

function isMark(ch: string): boolean {
  return (
    SHORT_VOWELS.has(ch) || TANWEEN.has(ch) || ch === SHADDA || ch === SUKUN || OTHER_MARKS.has(ch)
  );
}

/** The base letters of a string, in order (marks, tatweel and everything else dropped). */
export function skeleton(s: string): string {
  return Array.from(s).filter(isBaseLetter).join('');
}

function letterUnits(s: string): { base: string; marks: string }[] {
  const out: { base: string; marks: string }[] = [];
  for (const ch of Array.from(s)) {
    if (isBaseLetter(ch)) out.push({ base: ch, marks: '' });
    else if (isMark(ch) && out.length > 0) out[out.length - 1].marks += ch;
  }
  return out;
}

export type VowelStatus = 'full' | 'partial' | 'unvowelised';

/** Full, partial or no vowelling (audit rules 5 to 7). */
export function vowelStatus(s: string): VowelStatus {
  const u = letterUnits(s);
  if (u.length === 0 || u.every((x) => x.marks === '')) return 'unvowelised';
  let missing = 0;
  u.forEach(({ base, marks }, i) => {
    if (marks) return;
    if ('اآى'.includes(base)) return;
    if (i === u.length - 1) return;
    if (base === 'ة') return;
    const prev = i > 0 ? u[i - 1].marks : '';
    if (base === 'و' && prev.includes(DAMMA)) return;
    if (base === 'ي' && prev.includes(KASRA)) return;
    if (base === 'ل' && i === 1 && u[0].base === 'ا') return;
    missing += 1;
  });
  return missing === 0 ? 'full' : 'partial';
}

// ---- reads_as (D5) --------------------------------------------------------------

type ReadsAsRow = Pick<
  CuratedWord,
  'id' | 'arabic' | 'is_pseudo' | 'family_id' | 'reads_as_id' | 'retired_at'
>;

/** True for a live, real spelling that is not fully vowelled: the app has no reading for it yet. */
export function needsReading(word: ReadsAsRow): boolean {
  return !word.is_pseudo && word.retired_at === null && vowelStatus(word.arabic) !== 'full';
}

/** True when a person still has to confirm how `word` is read (needs one and has none). */
export function awaitsReadsAs(word: ReadsAsRow): boolean {
  return needsReading(word) && word.reads_as_id === null;
}

/**
 * The spellings `source` may be read as, best first (D5): fully vowelled, live,
 * real, the same letters, not itself read as another row, and in the same
 * family when both have one. The backend repeats every check.
 */
export function readsAsCandidates(source: ReadsAsRow, words: readonly ReadsAsRow[]): ReadsAsRow[] {
  if (!needsReading(source)) return [];
  const key = skeleton(source.arabic);
  return words
    .filter(
      (t) =>
        t.id !== source.id &&
        !t.is_pseudo &&
        t.retired_at === null &&
        t.reads_as_id === null &&
        skeleton(t.arabic) === key &&
        vowelStatus(t.arabic) === 'full' &&
        !(source.family_id && t.family_id && source.family_id !== t.family_id),
    )
    .sort(
      (a, b) =>
        Number(b.family_id === source.family_id && source.family_id !== null) -
          Number(a.family_id === source.family_id && source.family_id !== null) ||
        a.id.localeCompare(b.id),
    );
}

/** The "not reviewed" badge shows on a live, real spelling nobody has approved. */
export function isNotReviewed(word: Pick<CuratedWord, 'reviewed_at' | 'retired_at' | 'is_pseudo'>): boolean {
  return word.reviewed_at === null && word.retired_at === null && !word.is_pseudo;
}

/** Spellings that may join a family: real, live, and not already in another family. */
export function joinableWords<W extends Pick<CuratedWord, 'is_pseudo' | 'retired_at' | 'family_id'>>(
  words: readonly W[],
  familyId: string,
): W[] {
  return words.filter((w) => !w.is_pseudo && w.retired_at === null && w.family_id !== familyId);
}

// ---- backend refusals in plain words ---------------------------------------------

const MESSAGES: Record<string, string> = {
  WORD_IS_PSEUDO: 'A drill word has no family, meaning or picture.',
  WORD_RETIRED: 'A retired spelling cannot be used here.',
  READS_AS_SELF: 'A spelling cannot be read as itself.',
  READS_AS_SOURCE_VOWELLED: 'This spelling is already fully vowelled, so it needs no reading.',
  READS_AS_TARGET_NOT_VOWELLED: 'The reading must be a fully vowelled spelling.',
  READS_AS_SKELETON_MISMATCH: 'The reading must have the same letters.',
  READS_AS_CHAIN: 'That spelling is itself read as another one; pick the final one.',
  READS_AS_TARGET_RETIRED: 'That spelling is retired.',
  READS_AS_TARGET_PSEUDO: 'That spelling is a drill word.',
  READS_AS_FAMILY_MISMATCH: 'The reading must be in the same family.',
  WORD_NOT_FOUND: 'That spelling no longer exists.',
  WORD_FAMILY_NOT_FOUND: 'That family no longer exists.',
  // The Words page's connections (CG-5) and Review's Suggested links.
  PHRASE_REVIEWER_REQUIRED: 'Only a curriculum lead or a phrase reviewer can make connections.',
  WORD_IS_HEADWORD: "This spelling is the word's dictionary form, so it cannot leave. Make another form the dictionary form first.",
  WORD_IN_OTHER_FAMILY: 'This spelling is a form of another word. Take it out of that word first.',
  WORD_IN_FAMILY: 'A practice word has no family. Take the spelling out of its word first.',
  WORD_HAS_READING: 'A practice word has no reading. Clear its readings first.',
  WORD_FAMILY_EXISTS: 'A word with this id already exists. Pick another id.',
  CONCEPT_EXISTS: 'A meaning with this id already exists. Pick another id.',
  CONCEPT_NOT_FOUND: 'That meaning no longer exists.',
  ASSET_MEDIA_MISMATCH: 'That file is not a picture.',
  ASSET_NOT_LINKABLE: 'That picture cannot be used (retired or replaced).',
  ASSET_NOT_FOUND: 'That picture no longer exists.',
};

/** A sentence for a backend refusal code; falls back to the server's own message. */
export function familyErrorText(code: string | undefined, fallback: string): string {
  return (code && MESSAGES[code]) || fallback;
}
