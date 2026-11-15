/**
 * Canonical activity configs in Studio (content model CM-S3; design 3.1 and 5).
 *
 * A save sends references only, never a derived field (a glyph copy, a v1
 * display string, a per-letter audio): the server writes those. Two steps,
 * for the types whose form is converted (`CANONICAL_FORM_TYPES`):
 *
 * - **On edit** (`readConfigForEdit`): the stored row is read with the
 *   server's own read schema (`readActivityConfig`, synced from the backend),
 *   so a legacy row opens in the canonical shape with the same mapping the
 *   server uses. A row the read cannot map, or whose canonical shape v1
 *   cannot show yet (a word or picture mode, below), opens as before, through
 *   the `normalizeActivityConfig` shim.
 * - **On save** (`toSaveConfig`): the form's config is cut to what the
 *   server's write schema takes: references cleaned, legacy keys dropped,
 *   undefined values removed (as JSON does on the wire).
 *
 * Every other type keeps today's path: the shim on edit, the config as the
 * form built it on save.
 *
 * v1 limit: the server does not yet write the v1 display strings from a
 * reference (`word` from `wordRef`, `image` from `imageRef`, a word card's
 * `text`). Until it does, the word and picture modes of show_letter_or_word,
 * speech_practice and content_with_cards stay in their legacy shape, so the
 * v1 app keeps showing them.
 */

import {
  readActivityConfig,
  readLetterGlyph,
  readLetterRef,
} from "@kalam/curriculum-schemas/server";
import { normalizeActivityConfig } from "../../components/builder/forms/normalizeActivityConfig";
import { contrastPickerEnabled, isContrastId } from "./contrast";

export type Config = Record<string, unknown>;

const isRecord = (v: unknown): v is Config => typeof v === "object" && v !== null && !Array.isArray(v);

/** A copy as JSON sends it: no undefined values, no functions. */
export function asSent(config: Config): Config {
  return JSON.parse(JSON.stringify(config ?? {})) as Config;
}

function without(config: Config, keys: readonly string[]): Config {
  const next = { ...config };
  for (const k of keys) delete next[k];
  return next;
}

/** One letter value as a canonical reference (the server's `readLetterRef`). */
function ref(value: unknown): unknown {
  return readLetterRef(value);
}

/** A single-reference field: an array keeps its first element (the forms' single pickers). */
function singleRef(value: unknown): unknown {
  return ref(Array.isArray(value) ? value[0] : value);
}

function targetRefs(value: unknown): unknown {
  return Array.isArray(value) ? value.map(ref) : ref(value);
}

/**
 * Distractor references, keeping a picked `contrast` only where the type's
 * write schema stores it (`contrastPickerEnabled`).
 */
function distractorRefs(type: string, value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const keepContrast = contrastPickerEnabled(type);
  return value.map((d) => {
    const r = ref(d);
    if (keepContrast && isRecord(r) && isRecord(d) && isContrastId(d.contrast)) {
      return { ...r, contrast: d.contrast };
    }
    return r;
  });
}

// ---------------------------------------------------------------------------
// per-type writers: form state -> what the write schema takes
// ---------------------------------------------------------------------------

/** A writer, and whether a read canonical config may open in the form (v1 can show it). */
interface CanonicalType {
  write: (config: Config, type: string) => Config;
  /** False keeps the stored row in its legacy shape (a mode v1 still reads from display strings). */
  canonicalOk?: (config: Config) => boolean;
  /** Fields left absent when the stored row has none (v1 reads their presence). */
  keepAbsent?: readonly string[];
  /** False opens the stored row through the shim (its canonical read would change what v1 shows). */
  storedOk?: (stored: Config) => boolean;
}

const LEGACY_HUNT_KEYS: Readonly<Record<string, string>> = { showArabicLabels: "showArabicLabel" };

/** Letter hunts (`letter_hunt.ts`): the 15 themed hunts and the five older ones on the shared form. */
function writeHunt(config: Config, type: string): Config {
  const next = without(config, ["correctLetter"]);
  for (const [legacy, canonical] of Object.entries(LEGACY_HUNT_KEYS)) {
    if (legacy in next) {
      if (next[canonical] === undefined) next[canonical] = next[legacy];
      delete next[legacy];
    }
  }
  if (next.targetLetter === undefined && config.correctLetter !== undefined) {
    next.targetLetter = config.correctLetter;
  }
  if (next.targetLetter !== undefined) next.targetLetter = targetRefs(next.targetLetter);
  if (next.distractorLetters !== undefined) {
    next.distractorLetters = distractorRefs(type, next.distractorLetters);
  }
  return next;
}

const HUNT: CanonicalType = { write: writeHunt };

/** Letter fields that hold one reference, by type. */
function singleLetter(field: string): CanonicalType {
  return {
    write: (config) => {
      const next = { ...config };
      if (next[field] !== undefined) next[field] = singleRef(next[field]);
      return next;
    },
  };
}

const FORMS = ["isolated", "initial", "medial", "final"];

/** trace_letter: the reference only; the legacy glyph `letterForm` and `position` are read into it. */
function writeTrace(config: Config): Config {
  const next = without(config, ["letterForm", "position"]);
  let target = config.targetLetter;
  if (target == null && config.letterForm != null) {
    const r = ref(config.letterForm);
    target = isRecord(r) && FORMS.includes(config.position as string) ? { ...r, form: config.position } : r;
  }
  if (target != null) next.targetLetter = singleRef(target);
  else delete next.targetLetter;
  return next;
}

/** tap_dot_position, drag_dots_to_letter: a glyph target takes its form from the legacy `position`, then `position` goes. */
function writeTargetWithPosition(config: Config): Config {
  const next = without(config, ["position"]);
  const target = config.targetLetter;
  if (target == null) return next;
  const r = singleRef(target);
  next.targetLetter = typeof target === "string" && isRecord(r) && FORMS.includes(config.position as string)
    ? { ...r, form: config.position }
    : r;
  return next;
}

/** drag_haraka_to_letter: references only. */
function writeHarakaToLetter(config: Config): Config {
  const next = { ...config };
  if (next.targetLetter != null) next.targetLetter = singleRef(next.targetLetter);
  if (Array.isArray(next.distractorLetters)) next.distractorLetters = next.distractorLetters.map(ref);
  return next;
}

/**
 * A legacy trace row whose glyph `letterForm` and `position` disagree (ب with
 * `position: final`): v1 draws the glyph as stored, the server's read takes
 * the form from `position`. Such a row stays on the shim.
 */
function traceGlyphKeepsItsForm(stored: Config): boolean {
  if (stored.targetLetter != null || typeof stored.letterForm !== "string") return true;
  if (!FORMS.includes(stored.position as string)) return true;
  return readLetterGlyph(stored.letterForm)?.form === stored.position;
}

function writeMemoryCards(config: Config): Config {
  if (!Array.isArray(config.letters)) return config;
  return {
    ...config,
    // letters own their audio (design 3.1): no per-card audioId, audioUrl or audioPath
    letters: config.letters.map((l) => {
      const r = ref(l);
      if (!isRecord(r) || !isRecord(l)) return r;
      const matching = l.matchingForm;
      return matching !== undefined && matching !== r.form ? { ...r, matchingForm: matching } : r;
    }),
  };
}

/** show_letter_or_word in letter mode: the reference only, no v1 display strings. */
function writeShowLetter(config: Config): Config {
  if ((config.contentType ?? "letter") !== "letter") return config;
  const next = without(config, ["letter", "word", "image", "wordRef", "imageRef"]);
  next.contentType = "letter";
  const target = config.targetLetter ?? config.letter;
  if (target !== undefined && target !== null) next.targetLetter = singleRef(target);
  else delete next.targetLetter;
  return next;
}

/** speech_practice in letter mode: the reference only, no word or in-word focus glyph. */
function writeSpeechLetter(config: Config): Config {
  if ((config.contentType ?? "letter") !== "letter") return config;
  // contentType is optional (letter by default): a row without it stays without it
  const next = without(config, ["letter", "word", "wordRef"]);
  const target = config.targetLetter ?? (isRecord(config.letter) ? config.letter : undefined);
  if (target !== undefined && target !== null) next.targetLetter = singleRef(target);
  else delete next.targetLetter;
  return next;
}

/** True when every card is a letter card (a reference, or nothing typed yet). */
function lettersOnly(cards: unknown): boolean {
  if (!Array.isArray(cards)) return true;
  return cards.every((c) => {
    if (!isRecord(c)) return false;
    if (c.kind !== undefined) return c.kind === "letter";
    if (typeof c.image === "string" && c.image) return false;
    return c.letter != null || !(typeof c.text === "string" && c.text.trim());
  });
}

function cardsLetterMode(config: Config): boolean {
  return (config.contentType ?? "letter") === "letter" &&
    (config.cardMode ?? "letter") === "letter" &&
    lettersOnly(config.cards);
}

/**
 * content_with_cards with letter content and letter cards: each card a letter
 * content item (`{ id, kind: 'letter', letter, isCorrect }`), no glyph `text`,
 * no `cardMode`, no copied `content`.
 */
function writeLetterCards(config: Config): Config {
  if (!cardsLetterMode(config)) return config;
  const next = without(config, ["cardMode", "content"]);
  if (Array.isArray(config.cards)) {
    next.cards = config.cards.map((c) => {
      if (!isRecord(c)) return c;
      const card: Config = { id: c.id, kind: "letter" };
      if (c.letter != null) card.letter = ref(c.letter);
      if (typeof c.isCorrect === "boolean") card.isCorrect = c.isCorrect;
      if (typeof c.label === "string") card.label = c.label;
      return card;
    });
  }
  if (next.targetLetter != null) next.targetLetter = singleRef(next.targetLetter);
  else delete next.targetLetter;
  return next;
}

const isLetterMode = (config: Config) => (config.contentType ?? "letter") === "letter";

/**
 * The types whose Studio form now saves the canonical shape. Every one of
 * them has a test that runs the server's write schema on the form's output
 * (`canonical.test.ts`).
 */
export const CANONICAL_FORM_TYPES: Readonly<Record<string, CanonicalType>> = {
  // themed letter hunts (TargetLetterWithDistractorsForm)
  grid_tap: HUNT,
  pick_from_tree: HUNT,
  pick_flowers: HUNT,
  tap_crescent_moons: HUNT,
  drag_to_animal_mouth: HUNT,
  feed_rabbit: HUNT,
  feed_baby: HUNT,
  piggy_bank: HUNT,
  snowflakes: HUNT,
  bear_honey: HUNT,
  fly_on_flowers: HUNT,
  deliver_envelope: HUNT,
  plant_seeds: HUNT,
  balance_scale: HUNT,
  ice_cream_stacking: HUNT,
  // older hunts
  pop_balloons_with_letter: HUNT,
  letter_rain: HUNT,
  catch_fish_with_letter: HUNT,
  letter_discrimination: HUNT,
  i_spy: HUNT,
  // one letter
  color_letter: singleLetter("letter"),
  tap_dot_position: { write: writeTargetWithPosition },
  drag_dots_to_letter: { write: writeTargetWithPosition },
  drag_haraka_to_letter: { write: writeHarakaToLetter },
  trace_letter: { write: writeTrace, storedOk: traceGlyphKeepsItsForm },
  memory_card_match: { write: writeMemoryCards },
  // letter modes only (word and picture modes wait for server-written v1 strings)
  show_letter_or_word: { write: writeShowLetter, canonicalOk: isLetterMode },
  speech_practice: { write: writeSpeechLetter, canonicalOk: isLetterMode, keepAbsent: ["contentType"] },
  content_with_cards: { write: writeLetterCards, canonicalOk: cardsLetterMode },
};

/**
 * Types taken back to the shim because opening and saving a stored row would
 * change a field the v1 app reads (CM-B31, `v1Fields.test.ts`). They open
 * through the shim and save exactly as before, until the server writes the
 * fields v1 reads. Empty: on the PROD shapes no converted type changes a v1
 * field beyond what the shim already did. Rows are also kept on the shim one
 * by one (`openForEdit`: an unreadable row, a word or picture mode, a trace
 * glyph whose form disagrees with `position`).
 */
export const V1_BLOCKED_TYPES: readonly string[] = [];

export function isCanonicalFormType(type: string | undefined): boolean {
  return !!type && Object.prototype.hasOwnProperty.call(CANONICAL_FORM_TYPES, type) &&
    !V1_BLOCKED_TYPES.includes(type);
}

/**
 * Open a stored row for editing. A converted type's row is read into the
 * canonical shape with the server's read schema (`canonical: true`); a row the
 * read cannot map, or one in a mode v1 still reads from display strings, opens
 * through the shim (`canonical: false`) and saves exactly as before. A new
 * activity (empty config) is canonical. Other types go through the shim.
 */
export function openForEdit(type: string | undefined, stored: Config): { config: Config; canonical: boolean } {
  const legacy = () => ({ config: normalizeActivityConfig(type, stored), canonical: false });
  if (!type || !stored || !isCanonicalFormType(type)) return legacy();
  if (Object.keys(stored).length === 0) return { config: stored, canonical: true };
  const entry = CANONICAL_FORM_TYPES[type];
  const read = readActivityConfig(type, stored);
  if (!read.success) return legacy();
  if (entry.storedOk && !entry.storedOk(stored)) return legacy();
  if (entry.canonicalOk && !entry.canonicalOk(read.config)) return legacy();
  const config = entry.write(read.config, type);
  for (const key of entry.keepAbsent ?? []) if (!(key in stored)) delete config[key];
  return { config, canonical: true };
}

/** The config a form edits (`openForEdit`). */
export function readConfigForEdit(type: string | undefined, stored: Config): Config {
  return openForEdit(type, stored).config;
}

/**
 * The config a save sends. A row opened canonically, and still in a mode v1
 * can show canonically, sends what the write schema takes; anything else is
 * sent as the form built it, as before CM-S3.
 */
export function toSaveConfig(type: string | undefined, config: Config, canonical = true): Config {
  if (!canonical || !type || !isCanonicalFormType(type)) return config;
  const entry = CANONICAL_FORM_TYPES[type];
  if (entry.canonicalOk && !entry.canonicalOk(config)) return config;
  return asSent(entry.write(asSent(config), type));
}
