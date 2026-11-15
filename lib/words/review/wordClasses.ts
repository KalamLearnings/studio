// Synced copy of the backend word classifier (content-audit/word-classes.ts, CM-D0, word-classes@1). Keep identical apart from the Array.from wrappers the ES5 target needs.
import {
  DAMMA,
  hasAuditMarks,
  isAuditMark,
  isBaseLetter,
  isPresentationForm,
  KASRA,
  letterUnits,
  SHADDA,
  shortMarks,
  skeleton,
  SUKUN,
  TATWEEL,
} from './arabicText';

export const WORD_CLASSIFIER_VERSION = 'word-classes@1';

export type WordClass =
  | 'real_full'
  | 'real_partial'
  | 'unvowelised'
  | 'drill'
  | 'letter'
  | 'case_variant'
  | 'malformed';

export const WORD_CLASSES: readonly WordClass[] = [
  'real_full',
  'drill',
  'letter',
  'case_variant',
  'malformed',
  'real_partial',
  'unvowelised',
];

export interface WordClassInput {
  id: string;
  arabic: string;
  created_at: string | null;
}

export interface WordClassResult {
  id: string;
  class: WordClass;
  /** Why: the drill rule (D1/D2/D3), the malformed defect, or `base: <text>` for a variant. */
  reason: string | null;
  skeleton: string;
}

/** Real two-consonant words (skeletons): the audit's hand list. Everything else with two letters is a drill. */
export const REAL_TWO_LETTER_SKELETONS: ReadonlySet<string> = new Set(
  ('أب أخ أم أن إذ إن بل حب حج حق حظ حد خذ دب دم ظل ظن عش في قد قط قل كل كم لم لن له من مد مر مخ ' +
    'هل هو هر يد فم شك صح طب سم رز ضد شم عم صف').split(' '),
);

const HAMZA_FAMILY = new Set(Array.from('اأإآءؤئ'));
const family = (ch: string) => (HAMZA_FAMILY.has(ch) ? 'ا' : ch);

function leadingMark(s: string): boolean {
  for (const ch of Array.from(s)) {
    if (isBaseLetter(ch)) return false;
    if (isAuditMark(ch)) return true;
  }
  return false;
}

/** Rules 1 and 2. Null class means "not decided yet". */
function structuralClass(s: string): { class: WordClass | null; reason: string | null } {
  const chars = Array.from(s);
  if (chars.some(isPresentationForm)) return { class: 'malformed', reason: 'presentation form' };
  const stray = chars.filter((ch) => !isBaseLetter(ch) && !isAuditMark(ch) && ch !== TATWEEL);
  if (stray.length > 0) {
    const shown = Array.from(new Set(stray)).sort().join('').replaceAll(' ', '<space>');
    return { class: 'malformed', reason: `stray chars: ${shown}` };
  }
  if (leadingMark(s)) return { class: 'malformed', reason: 'mark before first letter' };
  if (skeleton(s).length === 1) return { class: 'letter', reason: null };
  if (s.includes(TATWEEL)) return { class: 'malformed', reason: 'tatweel inside word' };
  return { class: null, reason: null };
}

/** Rule 3: the drill heuristics D1, D2, D3. */
export function drillReason(s: string, sk = skeleton(s)): string | null {
  const letters = Array.from(sk);
  if (letters.length >= 2 && new Set(letters.map(family)).size === 1) {
    return 'D1 same-letter/vowel sequence';
  }
  if (letters.length === 2 && !REAL_TWO_LETTER_SKELETONS.has(sk)) {
    return 'D2 two-consonant syllable not in real-word list';
  }
  if (letters.length >= 3) {
    const u = letterUnits(s);
    const v1 = shortMarks(u[0].marks);
    const v2 = shortMarks(u[1].marks);
    if (v1 === KASRA && (v2 === DAMMA || v2 === KASRA)) {
      return 'D3 impossible triliteral pattern (Ci-Cu / Ci-Ci)';
    }
  }
  return null;
}

export type VowelStatus = 'full' | 'partial' | 'unvowelised';

/** Rules 5 to 7: full, partial or no vowelling, with the indices of unmarked letters that should carry a mark. */
export function vowelStatus(s: string): { status: VowelStatus; missing: number[] } {
  const u = letterUnits(s);
  if (u.every((x) => x.marks === '')) return { status: 'unvowelised', missing: [] };
  const missing: number[] = [];
  u.forEach(({ base, marks }, i) => {
    if (marks) return;
    if ('اآى'.includes(base)) return;
    if (i === u.length - 1) return;
    if (base === 'ة') return;
    const prev = i > 0 ? u[i - 1].marks : '';
    if (base === 'و' && prev.includes(DAMMA)) return;
    if (base === 'ي' && prev.includes(KASRA)) return;
    if (base === 'ل' && i === 1 && u[0].base === 'ا') return;
    missing.push(i);
  });
  return { status: missing.length === 0 ? 'full' : 'partial', missing };
}

/** The case-variant key: every letter and mark except the last letter's vowel; a final shadda is kept. */
function variantStem(s: string): string {
  const u = letterUnits(s);
  const last = u[u.length - 1];
  return u.slice(0, -1).map((x) => x.base + x.marks).join('') + last.base +
    (last.marks.includes(SHADDA) ? 'S' : '');
}

/**
 * Classify every word. `edgeCounts` is the number of `activity_words` rows per
 * word id (it only orders the base of a case-variant group).
 */
export function classifyWords(
  words: readonly WordClassInput[],
  edgeCounts: ReadonlyMap<string, number> = new Map(),
): Map<string, WordClassResult> {
  const res = new Map<string, Omit<WordClassResult, 'class'> & { class: WordClass | null }>();
  for (const w of words) {
    const s = structuralClass(w.arabic);
    res.set(w.id, { id: w.id, class: s.class, reason: s.reason, skeleton: skeleton(w.arabic) });
  }
  const undecided = (w: WordClassInput) => res.get(w.id)!.class === null;

  for (const w of words) {
    if (!undecided(w)) continue;
    const d = drillReason(w.arabic);
    if (d) Object.assign(res.get(w.id)!, { class: 'drill', reason: d });
  }

  const groups = new Map<string, WordClassInput[]>();
  for (const w of words) {
    if (!undecided(w) || !hasAuditMarks(w.arabic)) continue;
    const key = variantStem(w.arabic);
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  for (const group of Array.from(groups.values())) {
    if (group.length < 2) continue;
    const rank = (w: WordClassInput): [number, number, string] => {
      const u = letterUnits(w.arabic);
      const finalVowel = shortMarks(u[u.length - 1].marks);
      return [
        finalVowel === '' || finalVowel === SUKUN ? 0 : 1,
        -(edgeCounts.get(w.id) ?? 0),
        w.created_at ?? '',
      ];
    };
    const sorted = [...group].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      return ra[0] - rb[0] || ra[1] - rb[1] || (ra[2] < rb[2] ? -1 : ra[2] > rb[2] ? 1 : 0);
    });
    for (const w of sorted.slice(1)) {
      Object.assign(res.get(w.id)!, { class: 'case_variant', reason: `base: ${sorted[0].arabic}` });
    }
  }

  for (const w of words) {
    if (!undecided(w)) continue;
    const { status } = vowelStatus(w.arabic);
    const cls: WordClass = status === 'full'
      ? 'real_full'
      : status === 'partial'
      ? 'real_partial'
      : 'unvowelised';
    res.get(w.id)!.class = cls;
  }
  const out = new Map<string, WordClassResult>();
  for (const [id, r] of Array.from(res)) out.set(id, { ...r, class: r.class ?? 'unvowelised' });
  return out;
}

/** Rows per class, in the audit's order. */
export function countWordClasses(results: Iterable<WordClassResult>): Record<WordClass, number> {
  const counts = Object.fromEntries(WORD_CLASSES.map((c) => [c, 0])) as Record<WordClass, number>;
  for (const r of Array.from(results)) counts[r.class] += 1;
  return counts;
}
