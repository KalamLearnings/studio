/**
 * rules: the reading-rule vocabulary of the content model (CM-B3,
 * CONTENT_MODEL_DESIGN.md 2.2, 2.5; decision D6).
 *
 * One stable, fine-grained id per rule. There is no coarse `tanween` or `madd`
 * id: tanween is one rule per mark and madd one rule per carrier. A rule is one
 * knowledge component and is never multiplied by letters; the letter travels as
 * a facet. Unit keys are `rule:<ruleId>` (`rule:tanween_damm`, `rule:madd_alif`).
 *
 * CURRICULUM REVIEW. The curriculum lead reviews this file (CM-C7). Change it
 * only by pull request, with the curriculum lead's review. Never rename or
 * remove an id: index rows, attempts and mastery store these strings. Add a new
 * id instead, and list it in `skill_graph.ts` (its stage) in the same change.
 * Review done 2026-11-15 (CM-C7; the owner accepted every answer of
 * `content-model-audit/12-curriculum-review-answers.md`, decision R12): A7 adds
 * `hamzat_wasl_other` (the connecting hamza outside al-, a later step); A2 makes
 * `ta_marbuta` the reading of ة (its shape is the letter, `skill_graph.ts`);
 * B6 counts a long-vowel carrier as madd only after its matching short vowel.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/content-model/rules.ts
 *   studio/packages/curriculum-schemas/src/rules.ts
 * `scripts/sync-content-model.ts` copies it; `content-model-drift.test.ts` (both
 * repos) fails when the copies differ. The file therefore imports nothing and
 * targets ES2020.
 */

/** Every rule id, in display order. */
export const RULE_IDS = [
  'sukoon',
  'shadda',
  'madd_alif',
  'madd_waw',
  'madd_ya',
  'madd_dagger',
  'tanween_fath',
  'tanween_damm',
  'tanween_kasr',
  'qalqala',
  'al_shamsiyya',
  'al_qamariyya',
  'hamzat_wasl',
  'hamzat_wasl_other',
  'hamza_seat',
  'seat_alif',
  'ta_marbuta',
  'alif_maqsura',
  'non_connector',
  'lam_alif',
] as const;

export type RuleId = (typeof RULE_IDS)[number];

/**
 * Where a rule is derived from:
 * - `unit_tags`: the blend splitter's unit tags (and the unit's vowel);
 * - `glyphs`: the letters spelled inside the units (fixed glyph to `letters.id`
 *   pairs of the CM-B1 analyser);
 * - `letter_data`: a column of the `letters` table. `rulesFromUnits` cannot see
 *   it; the content-index extractor (CM-B9) adds these rules from the rows.
 */
export type RuleSource = 'unit_tags' | 'glyphs' | 'letter_data';

export interface RuleMeta {
  id: RuleId;
  /** English name; translated through `content_translations` (`rule_name`). */
  label: string;
  meaning: string;
  source: RuleSource;
}

export const RULE_META: Record<RuleId, RuleMeta> = {
  sukoon: {
    id: 'sukoon',
    label: 'Sukoon',
    meaning: 'A letter with no vowel closes the syllable',
    source: 'unit_tags',
  },
  shadda: {
    id: 'shadda',
    label: 'Shadda',
    meaning: 'A doubled letter',
    source: 'unit_tags',
  },
  madd_alif: {
    id: 'madd_alif',
    label: 'Long a (madd with alif)',
    meaning: 'Fatha lengthened by alif (or alif maqsura, or the madda of آ)',
    source: 'unit_tags',
  },
  madd_waw: {
    id: 'madd_waw',
    label: 'Long u (madd with waw)',
    meaning: 'Damma lengthened by waw',
    source: 'unit_tags',
  },
  madd_ya: {
    id: 'madd_ya',
    label: 'Long i (madd with ya)',
    meaning: 'Kasra lengthened by ya',
    source: 'unit_tags',
  },
  madd_dagger: {
    id: 'madd_dagger',
    label: 'Dagger alif',
    meaning: 'A small alif above the letter lengthens it to a long a',
    source: 'unit_tags',
  },
  tanween_fath: {
    id: 'tanween_fath',
    label: 'Fathatan',
    meaning: 'Nunation with fatha: -an',
    source: 'unit_tags',
  },
  tanween_damm: {
    id: 'tanween_damm',
    label: 'Dammatan',
    meaning: 'Nunation with damma: -un',
    source: 'unit_tags',
  },
  tanween_kasr: {
    id: 'tanween_kasr',
    label: 'Kasratan',
    meaning: 'Nunation with kasra: -in',
    source: 'unit_tags',
  },
  qalqala: {
    id: 'qalqala',
    label: 'Qalqala',
    meaning: 'Echo on ق ط ب ج د with sukoon',
    source: 'unit_tags',
  },
  al_shamsiyya: {
    id: 'al_shamsiyya',
    label: 'Sun lam',
    meaning: 'The lam of al- is silent and the sun letter after it is doubled',
    source: 'unit_tags',
  },
  al_qamariyya: {
    id: 'al_qamariyya',
    label: 'Moon lam',
    meaning: 'The lam of al- is pronounced with sukoon',
    source: 'unit_tags',
  },
  hamzat_wasl: {
    id: 'hamzat_wasl',
    label: 'Connecting hamza',
    meaning: 'The alif of al-, voiced only when the word starts the reading',
    source: 'unit_tags',
  },
  hamzat_wasl_other: {
    id: 'hamzat_wasl_other',
    label: 'Connecting hamza in other words',
    meaning:
      'A word-initial connecting alif outside al- (ٱبْن، ٱسْم، ٱذْهَب), voiced only when the word starts the reading',
    source: 'glyphs',
  },
  hamza_seat: {
    id: 'hamza_seat',
    label: 'Hamza seats',
    meaning: 'Hamza on alif, waw, ya or the line',
    source: 'glyphs',
  },
  seat_alif: {
    id: 'seat_alif',
    label: 'Silent alif of fathatan',
    meaning: 'The alif (or ى) that carries fathatan is not read',
    source: 'unit_tags',
  },
  ta_marbuta: {
    id: 'ta_marbuta',
    label: 'Ta marbuta',
    meaning:
      'How ة is read: t when it carries a vowel, h at a stop (taught with tanween and stopping)',
    source: 'glyphs',
  },
  alif_maqsura: {
    id: 'alif_maqsura',
    label: 'Alif maqsura',
    meaning: 'ى after fatha, read as a long a',
    source: 'unit_tags',
  },
  non_connector: {
    id: 'non_connector',
    label: 'Non-connecting letters',
    meaning: 'Letters that do not join the letter after them',
    source: 'letter_data',
  },
  lam_alif: {
    id: 'lam_alif',
    label: 'Lam-alif',
    meaning: 'The لا ligature: lam followed by alif',
    source: 'glyphs',
  },
};

export function isRuleId(value: unknown): value is RuleId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RULE_META, value);
}

/** `rule:<ruleId>`, the unit key of a rule. */
export function ruleKey(id: RuleId): string {
  return 'rule:' + id;
}

// ---------------------------------------------------------------------------
// From splitter units to rule ids
// ---------------------------------------------------------------------------

/**
 * The part of a blend unit (`BlendUnit` / `BlendDraftUnit` of
 * `blend/blend-word.ts`) that the rules read. Structural, so this file needs no
 * import; a splitter unit is assignable to it.
 */
export interface RuleUnit {
  /** The unit as spelled inside it (unpacked shadda), NFC. */
  text: string;
  tags: readonly string[];
  vowel: { v: 'a' | 'i' | 'u'; long: boolean; tanween: boolean } | null;
  codas: readonly { c: string }[];
}

const ALIF_MAQSURA = 'ى';
const TA_MARBUTA = 'ة';
const LAM = 'ل';
/** أ إ آ ؤ ئ ء: the six hamza seat letters (`letters.kind = hamza_seat`). */
const HAMZA_SEATS = 'أإآؤئء';
/** Alif and the alif seats that form the لا ligature after lam. */
const LIGATURE_ALIFS = 'اأإآ';

/**
 * The carriers that lengthen each short vowel (review B6): fatha + ا or ى, damma
 * + و, kasra + ي. A carrier with its own vowel, sukoon or shadda is a letter, and
 * the silent alif of fathatan is not a long mark.
 */
export const MADD_CARRIERS: Record<'a' | 'i' | 'u', string> = { a: 'اى', u: 'و', i: 'ي' };

const MADD_BY_VOWEL: Record<'a' | 'i' | 'u', RuleId> = {
  a: 'madd_alif',
  u: 'madd_waw',
  i: 'madd_ya',
};

const TANWEEN_BY_VOWEL: Record<'a' | 'i' | 'u', RuleId> = {
  a: 'tanween_fath',
  u: 'tanween_damm',
  i: 'tanween_kasr',
};

function baseLetters(text: string): string {
  return text.replace(/[ً-ٰٟ]/g, '');
}

/** A harakat mark (fathatan to sukoon, U+064B to U+0652). */
const MARK = /[ً-ْ]/;
/** Any mark a letter can carry, the dagger alif included. */
const ANY_MARK = /[ً-ٰٟ]/;

/** A unit's text holds a bare carrier of its vowel (B6), or آ for the long a. */
function hasMatchingCarrier(text: string, v: 'a' | 'i' | 'u'): boolean {
  const chars = Array.from(text);
  for (let i = 1; i < chars.length; i++) {
    if (MADD_CARRIERS[v].indexOf(chars[i] ?? '') >= 0 && !MARK.test(chars[i + 1] ?? '')) {
      return true;
    }
  }
  return v === 'a' && text.indexOf('آ') >= 0;
}

const WASL_ALIF = 'ٱ';
const SUKUN_MARK = 'ْ';

/**
 * A word that starts with a connecting hamza outside al- (review A7): ٱ (alif
 * wasla) not before lam, or a bare alif whose next letter carries a sukoon
 * (ابْن، اسْم: no word starts on a vowelless letter, so the alif connects).
 * al- (ال) is the `hamzat_wasl` rule, from the splitter's `wasl` tag.
 */
export function startsWithWaslOutsideAl(text: string): boolean {
  const chars = Array.from(text.normalize('NFC').replace(/ـ/g, ''));
  const first = chars[0];
  if (first !== WASL_ALIF && first !== 'ا') return false;
  if (first === 'ا' && ANY_MARK.test(chars[1] ?? '')) return false;
  let i = 1;
  while (i < chars.length && ANY_MARK.test(chars[i] ?? '')) i++;
  const next = chars[i];
  if (!next || next === LAM) return false;
  if (first === WASL_ALIF) return true;
  let j = i + 1;
  let marks = '';
  while (j < chars.length && ANY_MARK.test(chars[j] ?? '')) marks += chars[j++];
  return marks.indexOf(SUKUN_MARK) >= 0;
}

function rulesOfUnit(unit: RuleUnit, found: Set<RuleId>): void {
  const tags = unit.tags;
  const has = (tag: string) => tags.indexOf(tag) >= 0;
  if (has('sukoon')) found.add('sukoon');
  if (has('shaddaFirst') || has('shaddaSecond')) found.add('shadda');
  if (has('madd') && unit.vowel && hasMatchingCarrier(unit.text, unit.vowel.v)) {
    found.add(MADD_BY_VOWEL[unit.vowel.v]);
    if (unit.vowel.v === 'a' && unit.text.indexOf(ALIF_MAQSURA) >= 0) found.add('alif_maqsura');
  }
  if (has('madd:dagger')) found.add('madd_dagger');
  if (has('tanween') && unit.vowel) found.add(TANWEEN_BY_VOWEL[unit.vowel.v]);
  if (has('qalqala')) found.add('qalqala');
  if (has('sunLam')) found.add('al_shamsiyya');
  if (has('wasl')) {
    found.add('hamzat_wasl');
    if (!has('sunLam') && unit.codas.some((c) => c.c === LAM)) found.add('al_qamariyya');
  }
  if (has('seatAlif')) found.add('seat_alif');
  for (const ch of unit.text) {
    if (HAMZA_SEATS.indexOf(ch) >= 0) found.add('hamza_seat');
    if (ch === TA_MARBUTA) found.add('ta_marbuta');
  }
}

/**
 * The rule ids a word's units carry, deduplicated, in `RULE_IDS` order.
 *
 * Mapping (design 2.5): `sukoon` -> sukoon; `shaddaFirst` / `shaddaSecond` ->
 * shadda; `madd` + the unit's vowel -> madd_alif / madd_waw / madd_ya when the
 * unit holds the matching bare carrier (B6: ا or ى after fatha, و after damma,
 * ي after kasra; plus alif_maqsura when the long a is spelled with ى);
 * `madd:dagger` -> madd_dagger;
 * `tanween` + the vowel -> tanween_fath / tanween_damm / tanween_kasr;
 * `qalqala` -> qalqala; `sunLam` -> al_shamsiyya; `wasl` -> hamzat_wasl, plus
 * al_qamariyya when the wasl unit closes on a pronounced lam; `seatAlif` ->
 * seat_alif. From the glyphs: a hamza seat letter -> hamza_seat; ة ->
 * ta_marbuta; lam followed by an alif -> lam_alif; a connecting hamza outside
 * al- (`startsWithWaslOutsideAl`) -> hamzat_wasl_other. `non_connector` needs the
 * `letters` rows and is never returned here.
 *
 * Pass the units of the `full` split when the word's own rules are wanted: the
 * pausal split drops tanween (كِتَابٌ -> كِتَابْ) and reads fathatan with its seat
 * as a long a (كِتَابًا -> كِتَابَا), exactly as a child reading in pause does.
 */
export function rulesFromUnits(units: readonly RuleUnit[]): RuleId[] {
  const found = new Set<RuleId>();
  for (const unit of units) rulesOfUnit(unit, found);
  const spelled = units.map((u) => u.text).join('');
  if (startsWithWaslOutsideAl(spelled)) found.add('hamzat_wasl_other');
  const letters = baseLetters(spelled);
  for (let i = 0; i + 1 < letters.length; i++) {
    if (letters[i] === LAM && LIGATURE_ALIFS.indexOf(letters[i + 1] ?? '') >= 0) {
      found.add('lam_alif');
      break;
    }
  }
  return RULE_IDS.filter((id) => found.has(id));
}
