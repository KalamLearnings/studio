/**
 * blend-word: the rule-based syllable splitter for sound_blend (SB-B1).
 *
 * The single source of truth for how a fully vowelised Arabic word splits into
 * the syllables a child blends, and for each syllable's rule tags. The backend
 * runs it on save (and never trusts a client's split); Studio runs the same
 * file for its live preview. It is a port of the concept prototype
 * mobile-app-v2 `design/concepts/sound_blend/syllables.js` (TECH-DESIGN 2.1,
 * 3.1), timing-free.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/blend/blend-word.ts
 *   studio/packages/curriculum-schemas/src/blend-word.ts
 * `scripts/sync-blend-word.ts` copies it; `blend-word-drift.test.ts` fails when
 * the copies differ. The file therefore imports nothing: no Deno, no Node, no
 * zod, no relative paths, and it targets ES2020. It is deterministic: no AI, no
 * network, no clock. It never throws; problems are returned as issues.
 *
 * Rules (TECH-DESIGN 3.1):
 * - a consonant with fatha, kasra or damma opens a syllable (CV);
 * - a sukoon consonant closes the syllable before it and is never a unit alone;
 * - a shadda letter is two consonants: the first closes one syllable
 *   (shaddaFirst), the second opens the next (shaddaSecond): رَبِّ -> رَبْ | بِ;
 *   a word-final shadda with no vowel (pausal هِرّْ) is a doubled coda;
 * - madd stays inside its syllable: ا or ى after fatha, و after damma, ي or ى
 *   after kasra (sukoon allowed on و and ي, never a vowel or shadda); the dagger
 *   alif lengthens its letter; آ is hamza + long a. و or ي with its own vowel
 *   or shadda is a consonant (قَوِيَ -> قَ | وِ | يَ);
 * - tanween is the vowel plus a nun coda; the seat alif (or ى) after fathatan
 *   is silent and rides with that syllable (seatAlif);
 * - a sukoon on ق ط ب ج د is tagged qalqala;
 * - al-: a word-initial wasl alif before lam is voiced "a"; before a doubled sun
 *   letter the lam is silent (sunLam) and the doubled letter closes the first
 *   syllable (الشَّمْسُ -> الشْ | شَمْ | سُ); otherwise the lam closes it;
 * - a bare final letter is read with sukoon (warning inferred_sukoon); a bare
 *   letter elsewhere is the error missing_haraka.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Bumped whenever a rule changes; stored with every saved split. */
export const BLEND_SPLITTER_VERSION = 'blend-word@1';

/** The two ending forms a word can be read in (TECH-DESIGN 1.5). */
export type BlendForm = 'pausal' | 'full';

/** Syllable shapes a valid unit can take. */
export type BlendUnitKind = 'cv' | 'cvv' | 'cvc' | 'cvvc' | 'cvcc';

export type BlendUnitTag =
  | 'sukoon'
  | 'shaddaFirst'
  | 'shaddaSecond'
  | 'madd'
  | 'madd:dagger'
  | 'tanween'
  | 'qalqala'
  | 'wasl'
  | 'sunLam'
  | 'seatAlif';

export type BlendVowel = 'a' | 'i' | 'u';

/** Letter indices (base letters of the normalised word), inclusive. */
export interface BlendUnitSpan {
  from: number;
  to: number;
  /** The unit starts in the second half of a shadda letter. */
  startsMid?: boolean;
  /** The unit ends in the first half of a shadda letter. */
  endsMid?: boolean;
}

export interface BlendUnitOnset {
  /** The consonant voiced ('ء' for the wasl alif and for آ). */
  c: string;
  stop: boolean;
  /** The second half of a shadda letter. */
  second: boolean;
  wasl: boolean;
}

export interface BlendUnitCoda {
  c: string;
  stop: boolean;
  shaddaFirst: boolean;
  tanween: boolean;
  qalqala: boolean;
}

export interface BlendUnit {
  /** 'u0', 'u1', ... in reading order. */
  id: string;
  /** The unit as spelled inside it (unpacked shadda): 'رَبْ', 'بِ', 'تَابْ'. NFC. */
  text: string;
  kind: BlendUnitKind;
  tags: BlendUnitTag[];
  span: BlendUnitSpan;
  /** The unit's haraka: its vowel, whether it is long (madd) or tanween. */
  vowel: { v: BlendVowel; long: boolean; tanween: boolean };
  onset: BlendUnitOnset | null;
  codas: BlendUnitCoda[];
}

export type BlendIssueCode =
  | 'missing_haraka'
  | 'shadda_without_vowel'
  | 'stray_alif'
  | 'lone_consonant'
  | 'unit_without_vowel'
  | 'rebuild'
  | 'shadda_unpaired'
  | 'empty'
  | 'inferred_sukoon';

export type BlendIssueSeverity = 'error' | 'warning';

export interface BlendIssue {
  code: BlendIssueCode;
  severity: BlendIssueSeverity;
  /** Letter index the issue is about, when it is about one letter. */
  letter?: number;
  /** Unit index the issue is about, when it is about one unit. */
  unit?: number;
  message: string;
}

/** One base letter of the normalised word and the marks on it. */
export interface BlendLetter {
  letter: string;
  marks: string;
  /** UTF-16 offsets of the letter and its marks in `text`. */
  charStart: number;
  charEnd: number;
}

/**
 * A unit as the splitter found it. When the input is invalid a unit may have
 * no vowel; `kind` is then 'invalid' and an error issue says why.
 */
export type BlendDraftUnit =
  & Omit<BlendUnit, 'kind' | 'vowel'>
  & { kind: BlendUnitKind | 'invalid'; vowel: BlendUnit['vowel'] | null };

export interface BlendSplit {
  /** The exact normalised text that was split (the pausal text for 'pausal'). */
  text: string;
  form: BlendForm;
  splitterVersion: string;
  letters: BlendLetter[];
  units: BlendDraftUnit[];
  issues: BlendIssue[];
  /** True when there is no error issue; `units` are then valid `BlendUnit`s. */
  ok: boolean;
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

const FATHA = 'َ';
const DAMMA = 'ُ';
const KASRA = 'ِ';
const SUKUN = 'ْ';
const SHADDA = 'ّ';
const FATHATAN = 'ً';
const DAMMATAN = 'ٌ';
const KASRATAN = 'ٍ';
const DAGGER = 'ٰ';
const ALIF = 'ا';
const ALIF_WASLA = 'ٱ';
const ALIF_MADDA = 'آ';
const ALIF_MAQSURA = 'ى';
const LAM = 'ل';
const WAW = 'و';
const YA = 'ي';
const TA_MARBUTA = 'ة';
const HAMZA = 'ء';
const NUN = 'ن';

/** Stops: their closure is silent. ج is treated as a stop; ض is the MSA stop. */
const STOPS = 'بتدطكقءأإؤئجضة';
const QALQALA = 'قطبجد';
const SUN = 'تثدذرزسشصضطظلن';
const LONG_A = ALIF + ALIF_MAQSURA;

const MARK_RE = /[ً-ٰٟ]/g;
const SHORT_VOWEL_OR_TANWEEN_RE = /[ً-ِ]/g;

function isMark(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (c >= 0x064b && c <= 0x065f) || c === 0x0670;
}

// ---------------------------------------------------------------------------
// Normalisation and letters
// ---------------------------------------------------------------------------

/**
 * Plain vowelised text: presentation forms folded (NFKC), tatweel, whitespace
 * and ZWJ/ZWNJ removed, then NFC.
 */
export function normaliseBlendText(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/ـ/g, '')
    .replace(/[\s‌‍]/g, '')
    .normalize('NFC');
}

interface Letter {
  ch: string;
  marks: string;
  start: number;
  end: number;
  v: BlendVowel | null;
  tan: BlendVowel | null;
  sukoon: boolean;
  shadda: boolean;
  dagger: boolean;
  bare: boolean;
}

function vowelOf(marks: string): BlendVowel | null {
  if (marks.indexOf(FATHA) >= 0) return 'a';
  if (marks.indexOf(KASRA) >= 0) return 'i';
  if (marks.indexOf(DAMMA) >= 0) return 'u';
  return null;
}

function tanweenOf(marks: string): BlendVowel | null {
  if (marks.indexOf(FATHATAN) >= 0) return 'a';
  if (marks.indexOf(KASRATAN) >= 0) return 'i';
  if (marks.indexOf(DAMMATAN) >= 0) return 'u';
  return null;
}

function toLetters(word: string): Letter[] {
  const raw: { ch: string; marks: string; start: number; end: number }[] = [];
  let pos = 0;
  for (const ch of Array.from(word)) {
    const last = raw[raw.length - 1];
    if (isMark(ch) && last) {
      last.marks += ch;
      last.end = pos + ch.length;
    } else if (!isMark(ch)) {
      raw.push({ ch, marks: '', start: pos, end: pos + ch.length });
    }
    pos += ch.length;
  }
  return raw.map((r) => {
    const v = vowelOf(r.marks);
    const tan = tanweenOf(r.marks);
    const sukoon = r.marks.indexOf(SUKUN) >= 0;
    const shadda = r.marks.indexOf(SHADDA) >= 0;
    const dagger = r.marks.indexOf(DAGGER) >= 0;
    return {
      ...r,
      v,
      tan,
      sukoon,
      shadda,
      dagger,
      bare: !v && !tan && !sukoon && !shadda && !dagger,
    };
  });
}

// ---------------------------------------------------------------------------
// Pausal form
// ---------------------------------------------------------------------------

/**
 * The pausal form of a word (TECH-DESIGN 1.5): the last letter's short vowel or
 * tanween becomes sukoon. Fathatan with a seat alif (or ى) becomes fatha, so
 * the seat is read as a long a (كِتَابًا -> كِتَابَا); fathatan with no seat
 * (ة, or ء after alif) becomes sukoon. A final shadda keeps its shadda and
 * gains a sukoon (هِرُّ -> هِرّْ). A word with no final vowel is unchanged.
 */
export function pausal(raw: string): string {
  const word = normaliseBlendText(raw);
  const L = toLetters(word);
  let i = L.length - 1;
  while (i > 0) {
    const cur = L[i];
    const prev = L[i - 1];
    if (cur && prev && LONG_A.indexOf(cur.ch) >= 0 && cur.bare && prev.tan === 'a') i -= 1;
    else break;
  }
  const l = L[i];
  if (!l || l.dagger) return word;
  const hasSeat = i < L.length - 1;
  let marks = l.marks;
  if (l.tan === 'a' && hasSeat) {
    marks = marks.replace(FATHATAN, FATHA);
  } else if (l.tan || l.v) {
    marks = marks.replace(SHORT_VOWEL_OR_TANWEEN_RE, '');
    if (marks.indexOf(SUKUN) < 0) marks += SUKUN;
  } else {
    return word;
  }
  return (word.slice(0, l.start) + l.ch + marks + word.slice(l.end)).normalize('NFC');
}

// ---------------------------------------------------------------------------
// Phones and syllables
// ---------------------------------------------------------------------------

type Part = 'first' | 'second' | 'gem';

interface ConsonantPhone {
  t: 'C';
  li: number;
  c: string;
  stop: boolean;
  part?: Part;
  wasl?: boolean;
  tanween?: boolean;
}

interface VowelPhone {
  t: 'V';
  li: number;
  v: BlendVowel;
  long: boolean;
  dagger?: boolean;
  tanween?: boolean;
}

interface SilentPhone {
  t: 'S';
  li: number;
  seat?: boolean;
  sunLam?: boolean;
  carrier?: boolean;
  stray?: boolean;
}

type Phone = ConsonantPhone | VowelPhone | SilentPhone;

function issue(
  code: BlendIssueCode,
  message: string,
  where: { letter?: number; unit?: number } = {},
): BlendIssue {
  return {
    code,
    severity: code === 'inferred_sukoon' ? 'warning' : 'error',
    ...where,
    message,
  };
}

function isStop(ch: string, l: Letter): boolean {
  // a pausal ة is read as h, which can be held
  if (ch === TA_MARBUTA && !l.v && !l.tan) return false;
  return STOPS.indexOf(ch) >= 0;
}

function toPhones(L: Letter[], issues: BlendIssue[]): Phone[] {
  const P: Phone[] = [];
  const n = L.length;
  for (let i = 0; i < n; i++) {
    const l = L[i];
    if (!l) continue;
    const prev = L[i - 1];
    const next = L[i + 1];
    const prevV = prev && !prev.dagger ? prev.v : null;

    // al-: a word-initial wasl alif (bare, or with fatha) before lam
    const isAlif = l.ch === ALIF || l.ch === ALIF_WASLA;
    const waslMarks = l.marks === '' || l.marks === FATHA;
    if (i === 0 && isAlif && waslMarks && next && next.ch === LAM) {
      const after = L[i + 2];
      const sunLam = next.bare && !!after && after.shadda && SUN.indexOf(after.ch) >= 0;
      P.push({ t: 'C', li: i, c: HAMZA, stop: true, wasl: true });
      P.push({ t: 'V', li: i, v: 'a', long: false });
      if (sunLam) P.push({ t: 'S', li: i + 1, sunLam: true });
      else P.push({ t: 'C', li: i + 1, c: LAM, stop: false });
      i += 1;
      continue;
    }

    // آ: hamza + long a
    if (l.ch === ALIF_MADDA) {
      P.push({ t: 'C', li: i, c: HAMZA, stop: true });
      P.push({ t: 'V', li: i, v: 'a', long: true });
      continue;
    }

    // the seat alif (or ى) of fathatan: silent, rides with the letter before it
    if (LONG_A.indexOf(l.ch) >= 0 && l.bare && prev && prev.tan === 'a') {
      P.push({ t: 'S', li: i, seat: true });
      continue;
    }

    // madd carriers (sukoon allowed on و and ي)
    const noVowel = !l.v && !l.tan && !l.shadda;
    const maddA = LONG_A.indexOf(l.ch) >= 0 && l.bare && prevV === 'a';
    const maddU = l.ch === WAW && noVowel && prevV === 'u';
    const maddI = (l.ch === YA || l.ch === ALIF_MAQSURA) && noVowel && prevV === 'i';
    if (maddA || maddU || maddI) {
      const last = P[P.length - 1];
      if (last && last.t === 'V') last.long = true;
      P.push({ t: 'S', li: i, carrier: true });
      continue;
    }

    if (isAlif && l.bare) {
      issues.push(issue('stray_alif', 'a bare alif that is not after a fatha', { letter: i }));
      P.push({ t: 'S', li: i, stray: true });
      continue;
    }

    // a consonant
    const stop = isStop(l.ch, l);
    const vowelled = l.dagger || !!l.v || !!l.tan;
    if (l.shadda && !vowelled) {
      if (i === n - 1) {
        // a final doubled letter read in pause: one doubled coda
        if (!l.sukoon) {
          issues.push(
            issue('inferred_sukoon', 'final letter has no vowel; read as sukoon (pausal)', {
              letter: i,
            }),
          );
        }
        P.push({ t: 'C', li: i, c: l.ch, stop, part: 'gem' });
        P.push({ t: 'C', li: i, c: l.ch, stop, part: 'gem' });
      } else {
        issues.push(issue('shadda_without_vowel', 'shadda with no vowel', { letter: i }));
        P.push({ t: 'C', li: i, c: l.ch, stop, part: 'first' });
        P.push({ t: 'C', li: i, c: l.ch, stop, part: 'second' });
      }
      continue;
    }
    if (l.shadda) {
      P.push({ t: 'C', li: i, c: l.ch, stop, part: 'first' });
      P.push({ t: 'C', li: i, c: l.ch, stop, part: 'second' });
    } else {
      P.push({ t: 'C', li: i, c: l.ch, stop });
    }
    if (l.dagger) {
      P.push({ t: 'V', li: i, v: 'a', long: true, dagger: true });
    } else if (l.v) {
      P.push({ t: 'V', li: i, v: l.v, long: false });
    } else if (l.tan) {
      P.push({ t: 'V', li: i, v: l.tan, long: false, tanween: true });
      P.push({ t: 'C', li: i, c: NUN, stop: false, tanween: true });
    } else if (l.bare) {
      if (i === n - 1) {
        issues.push(
          issue('inferred_sukoon', 'final letter has no mark; read as sukoon (pausal)', {
            letter: i,
          }),
        );
      } else if (!(next && LONG_A.indexOf(next.ch) >= 0)) {
        issues.push(issue('missing_haraka', 'letter has no haraka', { letter: i }));
      }
    }
  }
  return P;
}

/** A C followed by a V opens a syllable; any other C closes the current one. */
function toSyllables(P: Phone[], issues: BlendIssue[]): Phone[][] {
  const units: Phone[][] = [];
  let cur: Phone[] | null = null;
  let pending: Phone[] = [];
  for (let k = 0; k < P.length; k++) {
    const p = P[k];
    if (!p) continue;
    const nx = P[k + 1];
    if (p.t === 'S') {
      if (cur) cur.push(p);
      else pending.push(p);
      continue;
    }
    if (p.t === 'C' && nx && nx.t === 'V') {
      cur = [...pending, p];
      pending = [];
      units.push(cur);
      continue;
    }
    if (p.t === 'C') {
      if (!cur) {
        issues.push(
          issue('lone_consonant', 'a consonant with no vowel before it', { letter: p.li }),
        );
        cur = [...pending, p];
        pending = [];
        units.push(cur);
        continue;
      }
      cur.push(p);
      continue;
    }
    // a vowel always follows its consonant, so `cur` exists; guard anyway
    if (!cur) {
      cur = [...pending];
      pending = [];
      units.push(cur);
    }
    cur.push(p);
  }
  if (pending.length) {
    const last = units[units.length - 1];
    if (last) last.push(...pending);
    else units.push(pending);
  }
  return units;
}

function describe(phones: Phone[], L: Letter[], index: number): BlendDraftUnit {
  const first = phones[0];
  const onsetPhone = first && first.t === 'C' ? first : null;
  let vowel: VowelPhone | null = null;
  for (const p of phones) {
    if (p.t === 'V') {
      vowel = p;
      break;
    }
  }
  const codas = phones.filter((p, i): p is ConsonantPhone => p.t === 'C' && i > 0);
  const isQalqala = (c: ConsonantPhone) =>
    c.stop && QALQALA.indexOf(c.c) >= 0 && c.part !== 'first' && !c.tanween;

  const tags: BlendUnitTag[] = [];
  if (codas.some((c) => c.part === 'first')) tags.push('shaddaFirst');
  if (onsetPhone && onsetPhone.part === 'second') tags.push('shaddaSecond');
  if (
    codas.some((c) => {
      const l = L[c.li];
      return !c.tanween && c.part !== 'first' && !!l && (l.sukoon || l.bare || c.part === 'gem');
    })
  ) {
    tags.push('sukoon');
  }
  if (vowel && vowel.long) tags.push(vowel.dagger ? 'madd:dagger' : 'madd');
  if (vowel && vowel.tanween) tags.push('tanween');
  if (codas.some(isQalqala)) tags.push('qalqala');
  if (phones.some((p) => p.t === 'C' && p.wasl)) tags.push('wasl');
  if (phones.some((p) => p.t === 'S' && p.sunLam)) tags.push('sunLam');
  if (phones.some((p) => p.t === 'S' && p.seat)) tags.push('seatAlif');

  const shape = 'c' + (vowel ? (vowel.long ? 'vv' : 'v') : '') + codas.map(() => 'c').join('');
  const valid: BlendUnitKind[] = ['cv', 'cvv', 'cvc', 'cvvc', 'cvcc'];
  const kind = (valid as string[]).indexOf(shape) >= 0 && onsetPhone
    ? (shape as BlendUnitKind)
    : 'invalid';

  // the unpacked display text: each letter as it is spelled inside this unit
  let text = '';
  const seen: Record<string, boolean> = {};
  for (const p of phones) {
    const l = L[p.li];
    if (!l) continue;
    const part = p.t === 'C' ? p.part : undefined;
    const key = p.li + (part === 'first' ? ':first' : '');
    if (seen[key]) continue;
    seen[key] = true;
    if (part === 'first') text += l.ch + SUKUN;
    else if (part === 'second') text += l.ch + l.marks.replace(SHADDA, '');
    else if (p.t === 'C' && p.wasl) text += l.ch;
    else text += l.ch + l.marks;
  }

  const lis = phones.map((p) => p.li);
  const span: BlendUnitSpan = { from: Math.min(...lis), to: Math.max(...lis) };
  if (onsetPhone && onsetPhone.part === 'second') span.startsMid = true;
  if (codas.some((c) => c.part === 'first')) span.endsMid = true;

  return {
    id: 'u' + index,
    text: text.normalize('NFC'),
    kind,
    tags,
    span,
    vowel: vowel ? { v: vowel.v, long: vowel.long, tanween: !!vowel.tanween } : null,
    onset: onsetPhone
      ? {
        c: onsetPhone.c,
        stop: onsetPhone.stop,
        second: onsetPhone.part === 'second',
        wasl: !!onsetPhone.wasl,
      }
      : null,
    codas: codas.map((c) => ({
      c: c.c,
      stop: c.stop,
      shaddaFirst: c.part === 'first',
      tanween: !!c.tanween,
      qalqala: isQalqala(c),
    })),
  };
}

// ---------------------------------------------------------------------------
// Hard rules (shared by the splitter and override checks)
// ---------------------------------------------------------------------------

function stripMarks(s: string): string {
  return s.replace(MARK_RE, '');
}

/**
 * The hard rules every split must pass, the splitter's own and an author's
 * override alike (TECH-DESIGN 2.1):
 * 1. the units rebuild the word (base letters; a shadda letter split across two
 *    units counts in both);
 * 2. every unit has a vowel;
 * 3. a shaddaFirst unit is followed by a shaddaSecond unit of the same letter.
 */
export function checkBlendUnits(
  rawText: string,
  units: readonly Pick<BlendUnit, 'text' | 'tags'>[],
): BlendIssue[] {
  const issues: BlendIssue[] = [];
  const L = toLetters(normaliseBlendText(rawText));
  if (!units.length) return [issue('empty', 'no units')];

  let expected = '';
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (!l) continue;
    const vowelled = l.dagger || !!l.v || !!l.tan;
    const splitAcross = l.shadda && (vowelled || i < L.length - 1);
    expected += splitAcross ? l.ch + l.ch : l.ch;
  }
  const rebuilt = units.map((u) => stripMarks(normaliseBlendText(u.text))).join('');
  if (rebuilt !== expected) {
    issues.push(issue('rebuild', `units spell "${rebuilt}", the word needs "${expected}"`));
  }

  units.forEach((u, i) => {
    const marks = normaliseBlendText(u.text);
    // the wasl alif is voiced "a" with no written vowel
    const hasVowel = /[ً-ِٰ]/.test(marks) ||
      marks.indexOf(ALIF_MADDA) >= 0 || u.tags.indexOf('wasl') >= 0;
    if (!hasVowel) {
      issues.push(
        issue('unit_without_vowel', `unit "${u.text}" has no vowel`, { unit: i }),
      );
    }
    if (u.tags.indexOf('shaddaFirst') >= 0) {
      const nextUnit = units[i + 1];
      const lastLetter = stripMarks(normaliseBlendText(u.text)).slice(-1);
      const nextFirst = nextUnit ? stripMarks(normaliseBlendText(nextUnit.text)).slice(0, 1) : '';
      if (!nextUnit || nextUnit.tags.indexOf('shaddaSecond') < 0 || nextFirst !== lastLetter) {
        issues.push(
          issue('shadda_unpaired', 'a shaddaFirst unit must be followed by its shaddaSecond', {
            unit: i,
          }),
        );
      }
    }
  });
  return issues;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Split a fully vowelised word into blend units. `form: 'full'` splits the
 * text as written (tanween voiced as vowel + nun); `form: 'pausal'` (the
 * default) splits `pausal(raw)`.
 */
export function splitBlendWord(raw: string, form: BlendForm = 'pausal'): BlendSplit {
  const text = form === 'pausal' ? pausal(raw) : normaliseBlendText(raw);
  const issues: BlendIssue[] = [];
  const L = toLetters(text);
  if (!L.length) {
    return {
      text,
      form,
      splitterVersion: BLEND_SPLITTER_VERSION,
      letters: [],
      units: [],
      issues: [issue('empty', 'no letters')],
      ok: false,
    };
  }
  const phones = toPhones(L, issues);
  const units = toSyllables(phones, issues).map((u, i) => describe(u, L, i));

  for (const issueFound of checkBlendUnits(text, units)) {
    // shadda_without_vowel already explains an unpaired shadda
    if (
      issueFound.code === 'shadda_unpaired' && issues.some((x) => x.code === 'shadda_without_vowel')
    ) {
      continue;
    }
    issues.push(issueFound);
  }

  return {
    text,
    form,
    splitterVersion: BLEND_SPLITTER_VERSION,
    letters: L.map((l) => ({ letter: l.ch, marks: l.marks, charStart: l.start, charEnd: l.end })),
    units,
    issues,
    ok: !issues.some((x) => x.severity === 'error'),
  };
}
