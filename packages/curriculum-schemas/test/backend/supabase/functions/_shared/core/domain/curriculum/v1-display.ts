/**
 * The v1 display fields of a canonical answer set, derived from its references
 * (content model R2, design 3.1 rule 4, CM-B12).
 *
 * A canonical save of `multiple_choice_question`, `content_with_cards` or
 * `match_pairs` sends references only: each option, card or pair side is a
 * content item (`kind` and one payload: a letter reference, a library word id,
 * an asset id, a numeral). The v1 app (`mobile-app`) reads display strings
 * instead (`tests/golden/v1-fields.json`). The save path writes them here, next
 * to the references, so the stored row shows in v1 exactly as the same content
 * in v1's own shape did:
 *
 * - MCQ option `text` (`{ en: '', ar }`): a word's spelling, a numeral's
 *   digits; a letter option keeps `{ en: '', ar: '' }` and the delivery writes
 *   its glyph (`enrichActivityConfig`), as for every letter option stored
 *   today. MCQ `question` (`{ en: '', ar }`) from a letter, word or numeral
 *   `prompt.target`, `questionImage` from an image target. MCQ `mode`: v1
 *   renders every mode but `image` as the option text (`MultipleChoiceActivity`
 *   line 138), and the references cannot tell `letter`, `word` and `text`
 *   apart, so the stored value (or its absence) is kept from the previous row.
 *   An empty stored `question` with no target is kept the same way.
 * - Card `text`: a word's spelling, a numeral's digits (a letter card's glyph
 *   is written by the delivery, as today).
 * - Pair side `type`, `value`, `audioUrl`: a letter's glyph (form and haraka,
 *   as the delivery draws letters) with the flat `letterId` / `form` /
 *   `haraka` the v1-era editor stored, a word's spelling, a numeral's digits
 *   (a `word` side, as v1 shows text), an image URL, an audio URL with its
 *   `audioId`.
 *
 * A stored glyph that reads as the same letter (form and haraka) is kept as
 * stored on an update: older editors wrote the same letter more than one way
 * (`جــ` with two tatweels, `لـِ` with the kasra after the tatweel, a leading
 * space), and v1 draws the stored string, so a re-save never redraws it. A
 * `madd` letter is drawn as Studio draws it: the glyph and its carrier letter
 * (`بَا`). An empty stored cards `content` (v1 shows nothing for it) is kept.
 *
 * Only a canonical answer set is derived: every option, card or pair side has
 * `kind`. A legacy or mixed config is returned unchanged. Deterministic and
 * idempotent: derived fields are always rewritten from the references, so a
 * second pass returns the same config.
 *
 * Not derivable, reported in `unresolved` (the save path rejects them, so a
 * row v1 cannot show is never stored): a reference that does not resolve; an
 * image or audio MCQ option or card (v1 reads their `image` key as a URL
 * string, the canonical item holds `image: { assetId }` there; and v1 has no
 * audio option); an audio MCQ stimulus.
 *
 * Pure: the letters, words and asset URLs come in through `V1DisplaySources`.
 */

import { applyHaraka } from '../../contracts/curriculum-schemas/harakat.ts';
import { isMaddHaraka, MADD_CARRIER_BY_HARAKA } from '../../contracts/curriculum-schemas/madd.ts';
import type { LetterData } from './letter-reference.ts';

type Rec = Record<string, unknown>;

/** The types whose answer sets carry v1 display fields derived here. */
export const V1_DISPLAY_TYPES: readonly string[] = [
  'multiple_choice_question',
  'content_with_cards',
  'match_pairs',
];

const KINDS = ['letter', 'word', 'image', 'audio', 'numeral'];

/** The keys of an MCQ config the server writes for v1. */
const MCQ_KEYS = ['mode', 'question', 'questionImage'];
/** The keys of a pair side the server writes for v1. */
const PAIR_SIDE_KEYS = ['type', 'value', 'audioUrl', 'audioId', 'letterId', 'form', 'haraka'];

const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A content item: a record with a known `kind`. */
export function isContentItem(v: unknown): v is Rec {
  return isRec(v) && typeof v.kind === 'string' && KINDS.includes(v.kind);
}

function without(rec: Rec, keys: readonly string[]): Rec {
  const next = { ...rec };
  for (const k of keys) delete next[k];
  return next;
}

const idOf = (payload: unknown, key: string): string | null =>
  isRec(payload) && typeof payload[key] === 'string' && payload[key]
    ? payload[key] as string
    : null;

/** What a derivation needs, looked up by the save path. */
export interface V1DisplaySources {
  /** `letters` rows by id, with their forms. */
  letters: Readonly<Record<string, LetterData>>;
  /** `curriculum_words.arabic` by word id. */
  words: ReadonlyMap<string, string>;
  /** Public URL by image asset id (`assets`). */
  images: ReadonlyMap<string, string>;
  /** Public URL by audio asset id (`audio_assets`, same id in `assets`, D8). */
  audio: ReadonlyMap<string, string>;
}

/** The references a derivation looks up. */
export interface V1DisplayRefs {
  letterIds: string[];
  wordIds: string[];
  imageIds: string[];
  audioIds: string[];
}

export interface V1Unresolved {
  /** The item's config path (`options.2`, `pairs.0.left`, `prompt.target`). */
  path: string;
  message: string;
}

export interface V1Display {
  config: Rec;
  /** True when the config is a canonical answer set of a `V1_DISPLAY_TYPES` type. */
  derived: boolean;
  unresolved: V1Unresolved[];
}

/** The content items of a canonical answer set with their paths, or null (legacy, mixed, other type). */
function answerSet(type: string, config: Rec): { path: string; item: Rec; role: Role }[] | null {
  const out: { path: string; item: Rec; role: Role }[] = [];
  switch (type) {
    case 'multiple_choice_question': {
      const options = config.options;
      if (!Array.isArray(options) || options.length === 0 || !options.every(isContentItem)) {
        return null;
      }
      options.forEach((o, n) => out.push({ path: `options.${n}`, item: o, role: 'option' }));
      const target = isRec(config.prompt) ? config.prompt.target : undefined;
      if (isContentItem(target)) {
        out.push({ path: 'prompt.target', item: target, role: 'stimulus' });
      }
      return out;
    }
    case 'content_with_cards': {
      const cards = config.cards;
      if (!Array.isArray(cards) || cards.length === 0 || !cards.every(isContentItem)) return null;
      cards.forEach((c, n) => out.push({ path: `cards.${n}`, item: c, role: 'card' }));
      return out;
    }
    case 'match_pairs': {
      const pairs = config.pairs;
      if (!Array.isArray(pairs) || pairs.length === 0) return null;
      for (const [n, p] of pairs.entries()) {
        if (!isRec(p) || !isContentItem(p.left) || !isContentItem(p.right)) return null;
        out.push({ path: `pairs.${n}.left`, item: p.left, role: 'side' });
        out.push({ path: `pairs.${n}.right`, item: p.right, role: 'side' });
      }
      return out;
    }
    default:
      return null;
  }
}

/** True when the config is a canonical answer set of a `V1_DISPLAY_TYPES` type (what `deriveV1Display` derives). */
export function isCanonicalAnswerSet(type: string, config: unknown): boolean {
  return isRec(config) && answerSet(type, config) !== null;
}

/** Where an item sits, which decides what v1 needs from it. */
type Role = 'option' | 'card' | 'stimulus' | 'side';

/** The references a derivation of this config looks up; empty for a config it leaves alone. */
export function v1DisplayRefs(type: string, config: unknown): V1DisplayRefs {
  const refs: V1DisplayRefs = { letterIds: [], wordIds: [], imageIds: [], audioIds: [] };
  const items = isRec(config) ? answerSet(type, config) : null;
  for (const { item, role } of items ?? []) {
    const add = (list: string[], id: string | null) => {
      if (id && !list.includes(id)) list.push(id);
    };
    switch (item.kind) {
      case 'letter':
        add(refs.letterIds, idOf(item.letter, 'letterId'));
        break;
      case 'word':
        add(refs.wordIds, idOf(item.word, 'wordId'));
        break;
      case 'image':
        if (role === 'stimulus' || role === 'side') add(refs.imageIds, idOf(item.image, 'assetId'));
        break;
      case 'audio':
        if (role === 'side') add(refs.audioIds, idOf(item.audio, 'assetId'));
        break;
    }
  }
  return refs;
}

/** A letter reference's glyph as the delivery draws it: the form's glyph, else the letter, plus the haraka. */
export function letterGlyph(
  letter: unknown,
  letters: Readonly<Record<string, LetterData>>,
): string | null {
  if (!isRec(letter) || typeof letter.letterId !== 'string') return null;
  const data = letters[letter.letterId];
  if (!data) return null;
  const form = letter.form as keyof NonNullable<LetterData['forms']>;
  const base = data.forms?.[form] || data.letter;
  const glyph = applyHaraka(base, letter.haraka as string | undefined);
  // madd (D7): the long vowel's carrier letter after the glyph, as Studio draws it (letterMadd.ts)
  if (letter.madd === true && isMaddHaraka(letter.haraka)) {
    return glyph + CARRIER_GLYPH[MADD_CARRIER_BY_HARAKA[letter.haraka]];
  }
  return glyph;
}

/** The glyph of each madd carrier letter (`MADD_CARRIER_BY_HARAKA`). */
const CARRIER_GLYPH: Readonly<Record<string, string>> = { alif: 'ا', waw: 'و', yaa: 'ي' };

const TATWEEL = '\u0640';
const MARK = /[\u064B-\u065F\u0670]/u;

/** A glyph string's letters, marks and tatweel ends, so two spellings of one letter compare equal. */
function glyphShape(text: string): string {
  const chars = [...text.normalize('NFC').replace(/\s+/gu, '')];
  const bare = chars.filter((c) => !MARK.test(c)).join('');
  const letters = chars.filter((c) => c !== TATWEEL && !MARK.test(c)).join('');
  const marks = chars.filter((c) => MARK.test(c)).sort().join('');
  const leading = bare.startsWith(TATWEEL) ? '-' : '';
  const trailing = bare.endsWith(TATWEEL) && bare.length > 1 ? '-' : '';
  return `${leading}${letters}${trailing}|${marks}`;
}

/** True when a stored display string draws the same letter as `glyph` (same letters, marks, form). */
export function sameGlyph(stored: unknown, glyph: string): boolean {
  return typeof stored === 'string' && stored.trim() !== '' &&
    glyphShape(stored) === glyphShape(glyph);
}

/** A numeral as v1 shows it: ASCII digits, as every PROD numeral option is stored. */
const digits = (item: Rec): string | null =>
  typeof item.numeral === 'number' && Number.isInteger(item.numeral) && item.numeral >= 0
    ? String(item.numeral)
    : null;

/** The text v1 shows for an item (glyph, spelling, digits), or null with the reason. */
function itemText(item: Rec, sources: V1DisplaySources): { text: string } | { why: string } {
  switch (item.kind) {
    case 'letter': {
      const glyph = letterGlyph(item.letter, sources.letters);
      if (glyph !== null) return { text: glyph };
      return { why: `unknown letter ${String(isRec(item.letter) ? item.letter.letterId : '')}` };
    }
    case 'word': {
      const id = idOf(item.word, 'wordId');
      const text = id ? sources.words.get(id) : undefined;
      return text !== undefined
        ? { text }
        : { why: id ? `unknown word ${id}` : 'a word item needs its wordId' };
    }
    case 'numeral': {
      const text = digits(item);
      return text !== null ? { text } : { why: 'a numeral must be a whole number' };
    }
    default:
      return { why: `v1 shows no text for a ${String(item.kind)} item` };
  }
}

function assetUrl(
  item: Rec,
  key: 'image' | 'audio',
  urls: ReadonlyMap<string, string>,
): { url: string; id: string } | { why: string } {
  const id = idOf(item[key], 'assetId');
  const url = id ? urls.get(id) : undefined;
  return url !== undefined
    ? { url, id: id as string }
    : { why: id ? `unknown ${key} asset ${id}` : `a ${key} item needs its assetId` };
}

const arabic = (v: unknown) => (isRec(v) && typeof v.ar === 'string' ? v.ar : '');
const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';

/** The stored entries of a list by their authored id. */
function byId(list: unknown): Map<string, Rec> {
  const out = new Map<string, Rec>();
  if (Array.isArray(list)) {
    for (const e of list) if (isRec(e) && typeof e.id === 'string') out.set(e.id, e);
  }
  return out;
}

function deriveMcq(
  config: Rec,
  sources: V1DisplaySources,
  previous: Rec,
  unresolved: V1Unresolved[],
): Rec {
  const next = without(config, MCQ_KEYS);
  const stored = byId(previous.options);
  next.options = (config.options as Rec[]).map((option, n) => {
    const base = without(option, ['text']);
    if (option.kind === 'letter') {
      // the delivery writes the glyph into an empty text; a stored glyph of the same letter stays
      const shown = itemText(option, sources);
      if ('why' in shown) unresolved.push({ path: `options.${n}`, message: shown.why });
      const was = arabic(stored.get(String(option.id))?.text);
      return {
        ...base,
        text: { en: '', ar: 'text' in shown && sameGlyph(was, shown.text) ? was : '' },
      };
    }
    if (option.kind === 'word' || option.kind === 'numeral') {
      const shown = itemText(option, sources);
      if ('why' in shown) unresolved.push({ path: `options.${n}`, message: shown.why });
      return { ...base, text: { en: '', ar: 'text' in shown ? shown.text : '' } };
    }
    unresolved.push({
      path: `options.${n}`,
      message: `v1 cannot show a canonical ${
        String(option.kind)
      } option (it reads option.image as a URL)`,
    });
    return base;
  });
  // v1 renders letter, word, text and no mode alike: the references cannot choose among them
  if (typeof previous.mode === 'string' && previous.mode !== 'image') next.mode = previous.mode;

  const target = isRec(config.prompt) ? config.prompt.target : undefined;
  if (isContentItem(target)) {
    if (target.kind === 'image') {
      const shown = assetUrl(target, 'image', sources.images);
      if ('why' in shown) unresolved.push({ path: 'prompt.target', message: shown.why });
      else next.questionImage = shown.url;
    } else {
      const shown = itemText(target, sources);
      const was = arabic(previous.question);
      if ('why' in shown) unresolved.push({ path: 'prompt.target', message: shown.why });
      else {next.question = {
          en: '',
          ar: target.kind === 'letter' && sameGlyph(was, shown.text) ? was : shown.text,
        };}
    }
  } else if (
    isRec(previous.question) && !arabic(previous.question).trim() && !filled(previous.questionImage)
  ) {
    // an empty stored question shows nothing in v1, as no question does: kept as stored
    next.question = previous.question;
  }
  return next;
}

const allEmpty = (v: unknown) =>
  isRec(v) && Object.values(v).every((x) => x === '' || x === null || x === undefined);

function deriveCards(
  config: Rec,
  sources: V1DisplaySources,
  previous: Rec,
  unresolved: V1Unresolved[],
): Rec {
  // an empty stored `content` shows nothing in v1, as no content does: kept as stored
  const content = config.content === undefined && allEmpty(previous.content)
    ? { content: previous.content }
    : {};
  return {
    ...config,
    ...content,
    cards: (config.cards as Rec[]).map((card, n) => {
      const base = without(card, ['text', 'letterDisplay']);
      if (card.kind === 'letter') {
        // the delivery writes a letter card's glyph; the letter must exist
        const shown = itemText(card, sources);
        if ('why' in shown) unresolved.push({ path: `cards.${n}`, message: shown.why });
        return base;
      }
      if (card.kind === 'word' || card.kind === 'numeral') {
        const shown = itemText(card, sources);
        if ('why' in shown) {
          unresolved.push({ path: `cards.${n}`, message: shown.why });
          return base;
        }
        return { ...base, text: shown.text };
      }
      unresolved.push({
        path: `cards.${n}`,
        message: `v1 cannot show a canonical ${
          String(card.kind)
        } card (it reads card.image as a URL)`,
      });
      return base;
    }),
  };
}

function deriveSide(
  side: Rec,
  path: string,
  sources: V1DisplaySources,
  stored: unknown,
  unresolved: V1Unresolved[],
): Rec {
  const base = without(side, PAIR_SIDE_KEYS);
  switch (side.kind) {
    case 'letter': {
      const shown = itemText(side, sources);
      if ('why' in shown) {
        unresolved.push({ path, message: shown.why });
        return base;
      }
      const ref = side.letter as Rec;
      const was = isRec(stored) && stored.type === 'letter' ? stored.value : undefined;
      return {
        ...base,
        type: 'letter',
        value: sameGlyph(was, shown.text) ? was : shown.text,
        letterId: ref.letterId,
        form: ref.form,
        ...(typeof ref.haraka === 'string' ? { haraka: ref.haraka } : {}),
      };
    }
    case 'word':
    case 'numeral': {
      const shown = itemText(side, sources);
      if ('why' in shown) {
        unresolved.push({ path, message: shown.why });
        return base;
      }
      return { ...base, type: 'word', value: shown.text };
    }
    case 'image': {
      const shown = assetUrl(side, 'image', sources.images);
      if ('why' in shown) {
        unresolved.push({ path, message: shown.why });
        return base;
      }
      return { ...base, type: 'image', value: shown.url };
    }
    case 'audio': {
      const shown = assetUrl(side, 'audio', sources.audio);
      if ('why' in shown) {
        unresolved.push({ path, message: shown.why });
        return base;
      }
      return { ...base, type: 'audio', audioUrl: shown.url, audioId: shown.id };
    }
    default:
      return base;
  }
}

function derivePairs(
  config: Rec,
  sources: V1DisplaySources,
  previous: Rec,
  unresolved: V1Unresolved[],
): Rec {
  const stored = Array.isArray(previous.pairs) ? previous.pairs : [];
  const at = (n: number, s: 'left' | 'right') => (isRec(stored[n]) ? stored[n][s] : undefined);
  return {
    ...config,
    pairs: (config.pairs as Rec[]).map((pair, n) => ({
      ...pair,
      left: deriveSide(pair.left as Rec, `pairs.${n}.left`, sources, at(n, 'left'), unresolved),
      right: deriveSide(pair.right as Rec, `pairs.${n}.right`, sources, at(n, 'right'), unresolved),
    })),
  };
}

/**
 * The config with the v1 display fields of its canonical answer set written
 * from its references. `previous` is the stored config an update replaces
 * (null on a create): it settles what the references cannot (the MCQ `mode`).
 */
export function deriveV1Display(
  type: string,
  config: unknown,
  sources: V1DisplaySources,
  previous: unknown = null,
): V1Display {
  if (!isRec(config) || !answerSet(type, config)) {
    return { config: config as Rec, derived: false, unresolved: [] };
  }
  const unresolved: V1Unresolved[] = [];
  const prev = isRec(previous) ? previous : {};
  const next = type === 'multiple_choice_question'
    ? deriveMcq(config, sources, prev, unresolved)
    : type === 'content_with_cards'
    ? deriveCards(config, sources, prev, unresolved)
    : derivePairs(config, sources, prev, unresolved);
  return { config: next, derived: true, unresolved };
}

/**
 * A stored canonical answer set without the fields `deriveV1Display` wrote:
 * what a save sent. A stored row checked again by its write schema (a topic
 * copy, a type change) is checked on this. Legacy configs are unchanged.
 */
export function withoutV1Display(type: string, config: unknown): unknown {
  if (!isRec(config) || !answerSet(type, config)) return config;
  switch (type) {
    case 'multiple_choice_question':
      return {
        ...without(config, MCQ_KEYS),
        options: (config.options as Rec[]).map((o) => without(o, ['text'])),
      };
    case 'content_with_cards': {
      const next: Rec = {
        ...config,
        cards: (config.cards as Rec[]).map((c) => without(c, ['text', 'letterDisplay'])),
      };
      if (allEmpty(next.content)) delete next.content;
      return next;
    }
    default:
      return {
        ...config,
        pairs: (config.pairs as Rec[]).map((p) => ({
          ...p,
          left: without(p.left as Rec, PAIR_SIDE_KEYS),
          right: without(p.right as Rec, PAIR_SIDE_KEYS),
        })),
      };
  }
}
