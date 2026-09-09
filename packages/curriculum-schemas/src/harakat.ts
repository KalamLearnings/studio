/**
 * Canonical Arabic diacritic (haraka) definitions.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/curriculum-schemas/harakat.ts
 *   studio/packages/curriculum-schemas/src/harakat.ts
 *   mobile-app/src/curriculum/constants/harakat.ts
 * Edit all three together. The file has no runtime dependencies so the same
 * source runs under Deno, Node and React Native.
 *
 * A haraka id names the complete set of marks a single letter carries. Simple
 * ids are one mark (fatha, kasratan, shadda). Composite ids pair shadda with a
 * vowel (shadda_fatha, shadda_dammatan). The `marks` string of every entry is
 * the combining sequence in Unicode NFC order (vowel before shadda), which is
 * what `String.prototype.normalize` produces, so text read from a word can be
 * matched by comparing component SETS rather than raw strings.
 */

/** The individual combining marks a haraka id can be built from. */
export const HARAKA_COMPONENTS = [
  'fatha',
  'damma',
  'kasra',
  'sukoon',
  'fathatan',
  'dammatan',
  'kasratan',
  'shadda',
] as const;

export type HarakaComponent = (typeof HARAKA_COMPONENTS)[number];

/** The vowel-like components: everything a shadda can be combined with. */
export type HarakaBase = Exclude<HarakaComponent, 'shadda'>;

export const HARAKA_COMPONENT_CHARS: Record<HarakaComponent, string> = {
  fathatan: 'ً',
  dammatan: 'ٌ',
  kasratan: 'ٍ',
  fatha: 'َ',
  damma: 'ُ',
  kasra: 'ِ',
  shadda: 'ّ',
  sukoon: 'ْ',
};

/** Every selectable haraka id, in display order. */
export const HARAKA_IDS = [
  'fatha',
  'damma',
  'kasra',
  'sukoon',
  'fathatan',
  'dammatan',
  'kasratan',
  'shadda',
  'shadda_fatha',
  'shadda_damma',
  'shadda_kasra',
  'shadda_fathatan',
  'shadda_dammatan',
  'shadda_kasratan',
] as const;

export type HarakaType = (typeof HARAKA_IDS)[number];

/** `HarakaType` plus the UI sentinel for "no diacritic". */
export type OptionalHaraka = HarakaType | 'none';

/** Which side of the letter the mark's vowel sits on. Drives drop-target tests. */
export type HarakaPlacement = 'above' | 'below';

export interface HarakaMeta {
  id: HarakaType;
  /** The component marks, shadda last. */
  components: readonly HarakaComponent[];
  /** Combining sequence in NFC order. */
  marks: string;
  label: string;
  arabic: string;
  /** Badge text for compact UI. */
  short: string;
  position: HarakaPlacement;
}

export const HARAKA_META: Record<HarakaType, HarakaMeta> = {
  fatha: {
    id: 'fatha',
    components: ['fatha'],
    marks: 'َ',
    label: 'Fatha',
    arabic: 'فَتْحَة',
    short: 'F',
    position: 'above',
  },
  damma: {
    id: 'damma',
    components: ['damma'],
    marks: 'ُ',
    label: 'Damma',
    arabic: 'ضَمَّة',
    short: 'D',
    position: 'above',
  },
  kasra: {
    id: 'kasra',
    components: ['kasra'],
    marks: 'ِ',
    label: 'Kasra',
    arabic: 'كَسْرَة',
    short: 'K',
    position: 'below',
  },
  sukoon: {
    id: 'sukoon',
    components: ['sukoon'],
    marks: 'ْ',
    label: 'Sukoon',
    arabic: 'سُكُون',
    short: 'S',
    position: 'above',
  },
  fathatan: {
    id: 'fathatan',
    components: ['fathatan'],
    marks: 'ً',
    label: 'Fathatan',
    arabic: 'تَنْوِين فَتْح',
    short: 'FF',
    position: 'above',
  },
  dammatan: {
    id: 'dammatan',
    components: ['dammatan'],
    marks: 'ٌ',
    label: 'Dammatan',
    arabic: 'تَنْوِين ضَمّ',
    short: 'DD',
    position: 'above',
  },
  kasratan: {
    id: 'kasratan',
    components: ['kasratan'],
    marks: 'ٍ',
    label: 'Kasratan',
    arabic: 'تَنْوِين كَسْر',
    short: 'KK',
    position: 'below',
  },
  shadda: {
    id: 'shadda',
    components: ['shadda'],
    marks: 'ّ',
    label: 'Shadda',
    arabic: 'شَدَّة',
    short: 'Sh',
    position: 'above',
  },
  shadda_fatha: {
    id: 'shadda_fatha',
    components: ['fatha', 'shadda'],
    marks: 'َّ',
    label: 'Shadda + Fatha',
    arabic: 'شَدَّة وَفَتْحَة',
    short: 'ShF',
    position: 'above',
  },
  shadda_damma: {
    id: 'shadda_damma',
    components: ['damma', 'shadda'],
    marks: 'ُّ',
    label: 'Shadda + Damma',
    arabic: 'شَدَّة وَضَمَّة',
    short: 'ShD',
    position: 'above',
  },
  shadda_kasra: {
    id: 'shadda_kasra',
    components: ['kasra', 'shadda'],
    marks: 'ِّ',
    label: 'Shadda + Kasra',
    arabic: 'شَدَّة وَكَسْرَة',
    short: 'ShK',
    position: 'below',
  },
  shadda_fathatan: {
    id: 'shadda_fathatan',
    components: ['fathatan', 'shadda'],
    marks: 'ًّ',
    label: 'Shadda + Fathatan',
    arabic: 'شَدَّة وَتَنْوِين فَتْح',
    short: 'ShFF',
    position: 'above',
  },
  shadda_dammatan: {
    id: 'shadda_dammatan',
    components: ['dammatan', 'shadda'],
    marks: 'ٌّ',
    label: 'Shadda + Dammatan',
    arabic: 'شَدَّة وَتَنْوِين ضَمّ',
    short: 'ShDD',
    position: 'above',
  },
  shadda_kasratan: {
    id: 'shadda_kasratan',
    components: ['kasratan', 'shadda'],
    marks: 'ٍّ',
    label: 'Shadda + Kasratan',
    arabic: 'شَدَّة وَتَنْوِين كَسْر',
    short: 'ShKK',
    position: 'below',
  },
};

/** Haraka id to its combining-mark sequence. */
export const HARAKA_CHARS: Record<HarakaType, string> = Object.fromEntries(
  HARAKA_IDS.map((id) => [id, HARAKA_META[id].marks]),
) as Record<HarakaType, string>;

/** Ids with no shadda component: the plain vowels and sukoon. */
export const SIMPLE_HARAKA_IDS: readonly HarakaType[] = HARAKA_IDS.filter(
  (id) => !HARAKA_META[id].components.includes('shadda'),
);

/** Ids that carry a shadda, bare or combined. */
export const SHADDA_HARAKA_IDS: readonly HarakaType[] = HARAKA_IDS.filter((id) =>
  HARAKA_META[id].components.includes('shadda')
);

export function isHarakaType(value: unknown): value is HarakaType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(HARAKA_META, value);
}

/** Any Arabic combining mark, including madda, hamza and dagger alif (U+064B–U+065F, U+0670). */
export const ARABIC_MARK_RE = /[ً-ٰٟ]/;

export function isArabicMark(ch: string): boolean {
  return ARABIC_MARK_RE.test(ch);
}

/** Tatweel / kashida (U+0640), used to force contextual letter forms. */
export const TATWEEL = 'ـ';

/**
 * Attach a haraka to a letter glyph. The marks are inserted before a trailing
 * tatweel so they anchor to the base glyph rather than the kashida stroke.
 * An unknown id, `'none'`, or no id returns the letter unchanged.
 */
export function applyHaraka(
  letter: string,
  haraka?: OptionalHaraka | string | null,
): string {
  if (!haraka || haraka === 'none' || !isHarakaType(haraka)) return letter;
  const marks = HARAKA_META[haraka].marks;
  if (letter.endsWith(TATWEEL)) {
    return letter.slice(0, -1) + marks + TATWEEL;
  }
  return letter + marks;
}

/** Remove every Arabic combining mark from a string. */
export function stripHarakat(text: string): string {
  return text.replace(/[ً-ٰٟ]/g, '');
}

const CHAR_TO_COMPONENT: Record<string, HarakaComponent> = Object.fromEntries(
  HARAKA_COMPONENTS.map((c) => [HARAKA_COMPONENT_CHARS[c], c]),
) as Record<string, HarakaComponent>;

/** The haraka components present in a string, in HARAKA_COMPONENTS order, deduplicated. */
export function harakaComponentsOf(text: string): HarakaComponent[] {
  const present = new Set<HarakaComponent>();
  for (const ch of text) {
    const component = CHAR_TO_COMPONENT[ch];
    if (component) present.add(component);
  }
  return HARAKA_COMPONENTS.filter((c) => present.has(c));
}

function sameComponents(a: readonly HarakaComponent[], b: readonly HarakaComponent[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((c) => set.has(c));
}

/**
 * Identify the haraka id carried by a letter unit (a base letter plus its
 * marks, or the marks alone). Marks that are not haraka components (madda,
 * hamza, dagger alif) are ignored. Returns null when no id matches, including
 * when the unit carries no marks at all.
 */
export function harakaFromMarks(text: string): HarakaType | null {
  const components = harakaComponentsOf(text);
  if (components.length === 0) return null;
  for (const id of HARAKA_IDS) {
    if (sameComponents(HARAKA_META[id].components, components)) return id;
  }
  return null;
}

/** Whether a letter unit carries any recognised haraka id. */
export function hasHaraka(text: string): boolean {
  return harakaFromMarks(text) !== null;
}

/**
 * Build a haraka id from a vowel-like base and a shadda flag, the way the
 * picker UI composes it. Returns null for combinations that do not exist:
 * shadda with sukoon, or no base and no shadda.
 */
export function composeHaraka(
  base: HarakaBase | 'none',
  shadda: boolean,
): HarakaType | null {
  if (base === 'none') return shadda ? 'shadda' : null;
  if (!shadda) return base;
  if (base === 'sukoon') return null;
  return `shadda_${base}` as HarakaType;
}

/** Split a haraka id into its vowel-like base and shadda flag. */
export function decomposeHaraka(haraka: HarakaType): {
  base: HarakaBase | 'none';
  shadda: boolean;
} {
  const components = HARAKA_META[haraka].components;
  const shadda = components.includes('shadda');
  const base = (components.find((c) => c !== 'shadda') as HarakaBase | undefined) ?? 'none';
  return { base, shadda };
}

/**
 * Split a word into per-letter units: each base character together with the
 * combining marks that follow it. Presentation-form glyphs are folded back to
 * their base letters first so the count matches what a font will shape.
 */
export function wordLetterUnits(text: string): string[] {
  const units: string[] = [];
  for (const ch of text.normalize('NFKC')) {
    if (isArabicMark(ch) && units.length > 0) {
      units[units.length - 1] += ch;
    } else {
      units.push(ch);
    }
  }
  return units;
}
