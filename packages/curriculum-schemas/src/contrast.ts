/**
 * contrast: error tags on distractors (CM-B19, CONTENT_MODEL_DESIGN.md 3.2;
 * decision D6).
 *
 * `contrast` says what a distractor differs from its target by. It is derived
 * from the two references wherever possible and picked by the author only when
 * it cannot be derived (`deriveContrast` returns null). It is required on every
 * distractor of a graded activity (section 5), and with the chosen key on an
 * attempt it turns "confuses ب and ت" into a query.
 *
 * CURRICULUM REVIEW. The curriculum lead reviews the ids and the derivation
 * table below (CM-C7). Change them only by pull request, with the curriculum
 * lead's review. Never rename or remove an id: index rows and attempts store
 * these strings. A new id also needs the `content_index.contrast` CHECK widened
 * by a migration.
 * Review done 2026-11-15 (CM-C7, decision R12; answers in
 * `content-model-audit/12-curriculum-review-answers.md`): B1 adds `sukoon`
 * (sukoon against a vowel, no longer `haraka`); B3 adds `shadda` (a shadda on
 * one side only, derived); B4 adds the joined dots group (ب ت ث ن ي in their
 * start and middle shapes); B6 is applied where a word becomes references
 * (content-index `wordShape`). B2, B5, B7 to B12 agree as they were; B2's "store
 * both kinds" refinement and B11's "sounds alike" kind are not built.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/content-model/contrast.ts
 *   studio/packages/curriculum-schemas/src/contrast.ts
 * `scripts/sync-content-model.ts` copies it; `content-model-drift.test.ts` (both
 * repos) fails when the copies differ. The file therefore imports nothing and
 * targets ES2020.
 */

export const CONTRAST_IDS = [
  'dots',
  'form',
  'short_long',
  'haraka',
  'tanween_haraka',
  'sun_moon',
  'shape',
  'sukoon',
  'shadda',
] as const;

export type ContrastId = (typeof CONTRAST_IDS)[number];

export const CONTRAST_META: Record<ContrastId, { id: ContrastId; differsBy: string }> = {
  dots: { id: 'dots', differsBy: 'Same base shape, different dots (ب ت ث)' },
  form: { id: 'form', differsBy: 'The wrong positional form of the same letter' },
  short_long: { id: 'short_long', differsBy: 'Short against long vowel (بَ against بَا)' },
  haraka: { id: 'haraka', differsBy: 'One short vowel against another (بَ against بِ)' },
  tanween_haraka: { id: 'tanween_haraka', differsBy: 'Tanween against the plain haraka' },
  sun_moon: { id: 'sun_moon', differsBy: 'A sun letter against a moon letter after al-' },
  shape: { id: 'shape', differsBy: 'An unrelated letter or unit' },
  sukoon: { id: 'sukoon', differsBy: 'Sukoon against a short vowel (بْ against بَ)' },
  shadda: { id: 'shadda', differsBy: 'A shadda on one side only (بَّ against بَ)' },
};

export function isContrastId(value: unknown): value is ContrastId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CONTRAST_META, value);
}

/**
 * Letters that share a base shape and differ only by dots: seven pairs and two
 * triplets (`letters.id`). ن and ي share the tooth of ب only when joined, so
 * they are not listed here; `JOINED_DOT_GROUP` covers their joined shapes.
 */
export const DOT_GROUPS: readonly (readonly string[])[] = [
  ['ba', 'ta', 'tha'],
  ['jeem', 'haa', 'khaa'],
  ['dal', 'thal'],
  ['ra', 'zay'],
  ['seen', 'sheen'],
  ['sad', 'dad'],
  ['taa', 'thaa'],
  ['ayn', 'ghayn'],
  ['faa', 'qaf'],
];

/**
 * In their start and middle shapes (نـ يـ بـ, review B4) these five share one
 * tooth and differ only by dots. Used when both references name one of those
 * forms.
 */
export const JOINED_DOT_GROUP: readonly string[] = ['ba', 'ta', 'tha', 'noon', 'yaa'];

const JOINED_FORMS = ['initial', 'medial'];

/** The sun letters (ت ث د ذ ر ز س ش ص ض ط ظ ل ن); every other base letter is a moon letter. */
export const SUN_LETTER_IDS: readonly string[] = [
  'ta',
  'tha',
  'dal',
  'thal',
  'ra',
  'zay',
  'seen',
  'sheen',
  'sad',
  'dad',
  'taa',
  'thaa',
  'lam',
  'noon',
];

/** The part of a `LetterReference` the derivation reads. */
export interface ContrastRef {
  letterId: string;
  form?: string | null;
  /** A haraka id (`HARAKA_IDS`), `'none'` or absent. */
  haraka?: string | null;
  /** Long vowel: only with fatha, damma or kasra (design 2.5). */
  madd?: boolean | null;
}

export interface ContrastContext {
  /** The item asks about the letter after al- (sun and moon letters). */
  afterAl?: boolean;
}

interface Marks {
  vowel: 'a' | 'i' | 'u' | 'sukoon' | null;
  tanween: boolean;
  shadda: boolean;
  madd: boolean;
}

function marksOf(ref: ContrastRef): Marks {
  const h = ref.haraka && ref.haraka !== 'none' ? ref.haraka : '';
  const shadda = h.indexOf('shadda') === 0;
  const base = shadda ? h.slice('shadda'.length).replace(/^_/, '') : h;
  const tanween = /^(fathatan|dammatan|kasratan)$/.test(base);
  let vowel: Marks['vowel'] = null;
  if (base.indexOf('fatha') === 0) vowel = 'a';
  else if (base.indexOf('damma') === 0) vowel = 'u';
  else if (base.indexOf('kasra') === 0) vowel = 'i';
  else if (base === 'sukoon') vowel = 'sukoon';
  return { vowel, tanween, shadda, madd: ref.madd === true };
}

function sameMarks(a: Marks, b: Marks): boolean {
  return a.vowel === b.vowel && a.tanween === b.tanween && a.shadda === b.shadda &&
    a.madd === b.madd;
}

function dotGroupOf(letterId: string): number {
  for (let i = 0; i < DOT_GROUPS.length; i++) {
    if ((DOT_GROUPS[i] ?? []).indexOf(letterId) >= 0) return i;
  }
  return -1;
}

function isSun(letterId: string): boolean {
  return SUN_LETTER_IDS.indexOf(letterId) >= 0;
}

/** Compare the marks of two references to the same letter. */
function marksContrast(t: Marks, d: Marks): ContrastId | null {
  if (t.shadda !== d.shadda) {
    // B3: the shadda is the only difference
    const same = t.vowel === d.vowel && t.tanween === d.tanween && t.madd === d.madd;
    return same ? 'shadda' : null;
  }
  if (t.vowel === d.vowel && t.vowel !== null && t.vowel !== 'sukoon') {
    if (t.tanween !== d.tanween && !t.madd && !d.madd) return 'tanween_haraka';
    if (t.madd !== d.madd && !t.tanween && !d.tanween) return 'short_long';
    return null;
  }
  const plain = (m: Marks) => m.vowel !== null && !m.tanween && !m.madd;
  if (!plain(t) || !plain(d)) return null;
  // B1: sukoon against a short vowel is its own kind
  if (t.vowel === 'sukoon' || d.vowel === 'sukoon') return 'sukoon';
  return 'haraka';
}

/**
 * The contrast between a target and a distractor, or null when it cannot be
 * derived and the author picks it. Derivation table:
 *
 * | Letters | Marks | Form | Contrast |
 * |---|---|---|---|
 * | same | same | different | `form` |
 * | same | same vowel, tanween on one only | same | `tanween_haraka` |
 * | same | same vowel, madd on one only | same | `short_long` |
 * | same | two different short vowels, no tanween, no madd | same | `haraka` |
 * | same | sukoon against a short vowel, no tanween, no madd | same | `sukoon` |
 * | same | shadda on one side only, the rest of the marks the same | same | `shadda` |
 * | different (one sun, one moon), after al- | same | any | `sun_moon` |
 * | different, same dot group | same | any | `dots` |
 * | different, both in ب ت ث ن ي, both start or middle shapes | same | start or middle | `dots` |
 * | different, otherwise | same | any | `shape` |
 *
 * Anything else is null: identical references (a domain-check error), two
 * differences at once (letter and marks, marks and form, or a shadda and
 * another mark), and a bare letter against a vowelled one. A missing form on
 * either side counts as the same form.
 */
export function deriveContrast(
  target: ContrastRef,
  distractor: ContrastRef,
  context: ContrastContext = {},
): ContrastId | null {
  const tm = marksOf(target);
  const dm = marksOf(distractor);
  const marksEqual = sameMarks(tm, dm);
  const formEqual = !target.form || !distractor.form || target.form === distractor.form;

  if (target.letterId !== distractor.letterId) {
    if (!marksEqual) return null;
    if (context.afterAl && isSun(target.letterId) !== isSun(distractor.letterId)) {
      return 'sun_moon';
    }
    const group = dotGroupOf(target.letterId);
    if (group >= 0 && group === dotGroupOf(distractor.letterId)) return 'dots';
    const joined = (r: ContrastRef) =>
      JOINED_FORMS.indexOf(r.form ?? '') >= 0 && JOINED_DOT_GROUP.indexOf(r.letterId) >= 0;
    if (joined(target) && joined(distractor)) return 'dots';
    return 'shape';
  }
  if (marksEqual) return formEqual ? null : 'form';
  if (!formEqual) return null;
  return marksContrast(tm, dm);
}

/**
 * The contrast between a target word and a distractor word (R10 (4)), or null.
 * Each word is its letters in order, one reference per letter, without forms
 * (a letter's form in a word follows from its neighbours) and without
 * long-vowel carriers (their length is the `madd` of the letter before them;
 * review B6: only a bare carrier after its matching short vowel is one).
 *
 * When the two words have the same number of letters and differ in exactly one
 * position (another letter, or other marks on the same letter), the contrast
 * is `deriveContrast` of that position, with `afterAl` when both words start
 * with al- (ا ل) and the position is the letter right after it. Anything else
 * is null and the author picks: two or more differences, different lengths,
 * identical words.
 */
export function deriveWordContrast(
  target: readonly ContrastRef[],
  distractor: readonly ContrastRef[],
): ContrastId | null {
  if (target.length !== distractor.length || target.length === 0) return null;
  let at = -1;
  for (let i = 0; i < target.length; i++) {
    const t = target[i] as ContrastRef;
    const d = distractor[i] as ContrastRef;
    if (t.letterId === d.letterId && sameMarks(marksOf(t), marksOf(d))) continue;
    if (at >= 0) return null;
    at = i;
  }
  if (at < 0) return null;
  const startsWithAl = (w: readonly ContrastRef[]) =>
    w.length > 2 && (w[0] as ContrastRef).letterId === 'alif' &&
    (w[1] as ContrastRef).letterId === 'lam';
  const t = target[at] as ContrastRef;
  const d = distractor[at] as ContrastRef;
  return deriveContrast(
    { letterId: t.letterId, haraka: t.haraka, madd: t.madd },
    { letterId: d.letterId, haraka: d.haraka, madd: d.madd },
    { afterAl: at === 2 && startsWithAl(target) && startsWithAl(distractor) },
  );
}
