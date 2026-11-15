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
 * these strings.
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
] as const;

export type ContrastId = (typeof CONTRAST_IDS)[number];

export const CONTRAST_META: Record<ContrastId, { id: ContrastId; differsBy: string }> = {
  dots: { id: 'dots', differsBy: 'Same base shape, different dots (ب ت ث)' },
  form: { id: 'form', differsBy: 'The wrong positional form of the same letter' },
  short_long: { id: 'short_long', differsBy: 'Short against long vowel (بَ against بَا)' },
  haraka: { id: 'haraka', differsBy: 'One short vowel (or sukoon) against another' },
  tanween_haraka: { id: 'tanween_haraka', differsBy: 'Tanween against the plain haraka' },
  sun_moon: { id: 'sun_moon', differsBy: 'A sun letter against a moon letter after al-' },
  shape: { id: 'shape', differsBy: 'An unrelated letter or unit' },
};

export function isContrastId(value: unknown): value is ContrastId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CONTRAST_META, value);
}

/**
 * Letters that share a base shape and differ only by dots: seven pairs and two
 * triplets (`letters.id`). ن and ي share the tooth of ب only when joined, so
 * they are not listed; a joined-form contrast is picked by the author.
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
  if (t.shadda !== d.shadda) return null;
  if (t.vowel === d.vowel && t.vowel !== null && t.vowel !== 'sukoon') {
    if (t.tanween !== d.tanween && !t.madd && !d.madd) return 'tanween_haraka';
    if (t.madd !== d.madd && !t.tanween && !d.tanween) return 'short_long';
    return null;
  }
  const plain = (m: Marks) => m.vowel !== null && !m.tanween && !m.madd;
  if (plain(t) && plain(d)) return 'haraka';
  return null;
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
 * | same | two different short vowels or sukoon, no tanween, no madd | same | `haraka` |
 * | different (one sun, one moon), after al- | same | any | `sun_moon` |
 * | different, same dot group | same | any | `dots` |
 * | different, otherwise | same | any | `shape` |
 *
 * Anything else is null: identical references (a domain-check error), two
 * differences at once (letter and marks, or marks and form), a shadda on one
 * side only, and a bare letter against a vowelled one. A missing form on either
 * side counts as the same form.
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
    return 'shape';
  }
  if (marksEqual) return formEqual ? null : 'form';
  if (!formEqual) return null;
  return marksContrast(tm, dm);
}
