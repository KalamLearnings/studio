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
 * v1 display fields (R2): for MCQ, cards and match pairs the server writes
 * what v1 reads from the references on save (backend
 * `core/domain/curriculum/v1-display.ts`): an option's `text`, the MCQ `mode`
 * and `question`, a card's `text`, a pair side's `type`, `value` and
 * `audioUrl`. So an answer set saves canonically when every item is one the
 * server can show to v1 (`v1Derivable`: a letter, a library word, a numeral,
 * and for pairs an audio clip). A picture item stays in v1's shape: v1 reads
 * an option's or card's `image` as a URL string, the key the canonical item
 * holds its asset reference in, and the asset registry is not on PROD yet.
 * The server does not write `image` from `imageRef` either, so the picture
 * mode of show_letter_or_word stays in its legacy shape, as does the word
 * mode of speech_practice. show_letter_or_word's word mode saves canonically
 * once it names a library word (`wordRef`, backend CM-D3e: the server writes
 * v1's `word` from it); a typed word with no library id stays legacy.
 */

import {
  readActivityConfig,
  readContentText,
  readLetterGlyph,
  readLetterRef,
} from "@kalam/curriculum-schemas/server";
import { normalizeActivityConfig } from "../../components/builder/forms/normalizeActivityConfig";
import { contrastPickerEnabled, isContrastId } from "./contrast";
import {
  cardItem,
  kindedItem,
  mcqOptionItem,
  pairSideItem,
  promptKind,
  toContentItemWrite,
  toContentRefWrite,
  writePrompt,
  type EditorItem,
} from "./contentItems";
import { writeReadAndMatch } from "../readingTypes/readAndMatch";
import { writeSentenceBuilder } from "../readingTypes/sentenceBuilder";
import { writeSoundSort } from "../readingTypes/soundSort";

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
  /** Display hints the read leaves out (a word's text, a clip's URL, the question), taken from the stored row. */
  hints?: (stored: Config, read: Config) => Config;
  /** What the form edits, from the hinted read; the written config when absent. */
  view?: (hinted: Config) => Config;
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

/** show_letter_or_word word mode naming a library word: the server writes v1's `word` from `wordRef`. */
const isShowLibraryWord = (config: Config): boolean =>
  config.contentType === "word" && isRecord(config.wordRef) &&
  typeof config.wordRef.wordId === "string" && config.wordRef.wordId !== "";

/**
 * show_letter_or_word: in letter mode the reference only; in word mode with a
 * library word, `wordRef: { wordId }` only (no `word`, the server writes it).
 * A legacy word or picture row is returned as it is.
 */
function writeShow(config: Config): Config {
  if (!isShowLibraryWord(config)) return writeShowLetter(config);
  const next = without(config, ["letter", "word", "image", "imageRef"]);
  next.wordRef = { wordId: (config.wordRef as Config).wordId };
  if (next.targetLetter != null) next.targetLetter = singleRef(next.targetLetter);
  else delete next.targetLetter;
  return next;
}

/** What the show form edits: a library word keeps its `word` text to show; a letter row is written. */
const viewShow = (hinted: Config): Config => (isShowLibraryWord(hinted) ? hinted : writeShowLetter(hinted));

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

// ---------------------------------------------------------------------------
// answer sets (CM-S6, R2): multiple_choice_question, content_with_cards, match_pairs
// ---------------------------------------------------------------------------

type ItemRole = "option" | "card" | "side" | "stimulus";

/**
 * True when the server writes every v1 display field of the item from its
 * reference (backend `v1-display.ts`): a letter, a library word (its id), a
 * whole numeral, and on a match pair side an audio clip (its id). Never a
 * picture: v1 reads an option's or card's `image` as a URL string where the
 * canonical item keeps `image: { assetId }`, and the asset registry is not on
 * PROD yet, so a picture stays in v1's shape.
 */
export function v1Derivable(item: EditorItem, role: ItemRole): boolean {
  switch (item.kind) {
    case "letter":
      return !!item.letter?.letterId;
    case "word":
      return !!item.word?.wordId;
    case "numeral":
      return typeof item.numeral === "number" && Number.isInteger(item.numeral) && item.numeral >= 0;
    case "audio":
      return role === "side" && !!item.audio?.assetId;
    case "image":
      return false;
  }
}

/** The MCQ keys the server derives for v1 or drops (`multiple_choice_question.ts`, `v1-display.ts`). */
const MCQ_DERIVED_KEYS = ["mode", "question", "questionImage", "contentType", "showImages", "correctOptionId"];

const filledText = (v: unknown) => typeof v === "string" && !!v.trim();

const arabicOf = (v: unknown): string =>
  typeof v === "string" ? v : isRecord(v) && typeof v.ar === "string" ? v.ar : "";

/** A stored v1-shape entry that carries a picture (v1 shows or preloads it; a canonical item cannot keep it). */
const hasPicture = (entry: unknown) =>
  isRecord(entry) && entry.kind === undefined && (filledText(entry.image) || filledText(entry.imageUrl));

/**
 * The MCQ stimulus as a content item, from what the form shows (`question.ar`):
 * the prompt's stored target while it still shows that text (a library word
 * keeps its id), else the text read as a letter or a numeral. `ok: false`
 * when the server could not write v1's `question` from it (a typed word with
 * no library id, a question picture).
 */
function mcqStimulus(config: Config): { ok: boolean; target?: EditorItem } {
  if (filledText(config.questionImage)) return { ok: false };
  const text = arabicOf(config.question).trim();
  if (!text) return { ok: true };
  const prompt = isRecord(config.prompt) ? config.prompt : {};
  const stored = isRecord(prompt.target) && typeof prompt.target.kind === "string"
    ? kindedItem(prompt.target)
    : undefined;
  if (stored?.kind === "word" && stored.word?.wordId && stored.word.text?.trim() === text) {
    return { ok: true, target: stored };
  }
  const read = readContentText(text);
  if (read && (read.kind === "letter" || read.kind === "numeral")) return { ok: true, target: kindedItem(read) };
  return { ok: false };
}

/**
 * An MCQ v1 can show from references alone: a prompt kind (the write schema
 * needs it), no picture mode, a stimulus the server can draw, and every
 * option a letter, a library word or a numeral.
 */
function mcqCanonicalOk(config: Config): boolean {
  if (!promptKind(config)) return false;
  if (config.mode === "image") return false;
  if (!mcqStimulus(config).ok) return false;
  if (!Array.isArray(config.options) || config.options.length === 0) return false;
  return config.options.every((o) =>
    isRecord(o) && !hasPicture(o) && v1Derivable(mcqOptionItem(o, config.mode), "option")
  );
}

/** MCQ options as content items; the stimulus as `prompt.target`; no `mode`, `question` or option `text`. */
function writeMcq(config: Config): Config {
  if (!mcqCanonicalOk(config)) return config;
  const next = without(config, MCQ_DERIVED_KEYS);
  next.options = (config.options as unknown[]).map((o) => toContentItemWrite(mcqOptionItem(o, config.mode)));
  const { target } = mcqStimulus(config);
  next.prompt = writePrompt({ kind: promptKind(config), ...(target ? { target } : {}) });
  if (next.targetLetter != null) next.targetLetter = targetRefs(next.targetLetter);
  else delete next.targetLetter;
  return next;
}

/**
 * A stored MCQ opens canonically unless v1 shows a picture in it: picture
 * mode, a question picture, or an option holding a picture (text with a
 * picture beside it is drawn as text and preloads the picture; a canonical
 * option keeps one payload, so the picture would go).
 */
function mcqStoredOk(stored: Config): boolean {
  if (stored.mode === "image" || filledText(stored.questionImage)) return false;
  return Array.isArray(stored.options) && stored.options.every((o) => isRecord(o) && !hasPicture(o));
}

/** A stored entry's library word id (a v1-shape entry Studio saved keeps it as `word: { wordId }`). */
const storedWordId = (entry: unknown): string | undefined =>
  isRecord(entry) && isRecord(entry.word) && typeof entry.word.wordId === "string" && entry.word.wordId
    ? entry.word.wordId
    : undefined;

/**
 * A read word item with what the read leaves out: the text the server wrote
 * beside it (its display hint) and the library id a v1-shape entry kept.
 */
function withWordText(item: unknown, text: string, wordId?: string): unknown {
  if (!isRecord(item) || item.kind !== "word") return item;
  const word = isRecord(item.word) ? { ...item.word } : {};
  if (!word.text && text) word.text = text;
  if (!word.wordId && wordId) word.wordId = wordId;
  return { ...item, word };
}

/** Stored entries by their authored id. */
function storedById(list: unknown): Map<string, Config> {
  const out = new Map<string, Config>();
  if (Array.isArray(list)) for (const e of list) if (isRecord(e) && typeof e.id === "string") out.set(e.id, e);
  return out;
}

/** The stored question (the form shows it) and the word texts the server wrote. */
function mcqHints(stored: Config, read: Config): Config {
  const next = { ...read };
  if (isRecord(stored.question)) next.question = stored.question;
  if (Array.isArray(read.options)) {
    const was = storedById(stored.options);
    next.options = read.options.map((o) =>
      isRecord(o) ? withWordText(o, arabicOf(o.text), storedWordId(was.get(String(o.id)))) : o
    );
  }
  if (isRecord(read.prompt) && read.prompt.target !== undefined) {
    next.prompt = { ...read.prompt, target: withWordText(read.prompt.target, arabicOf(stored.question)) };
  }
  return next;
}

/** content_with_cards a v1 can show from references: letter content, every card a letter, library word or numeral. */
function cardsCanonicalOk(config: Config): boolean {
  if ((config.contentType ?? "letter") !== "letter") return false;
  if (!Array.isArray(config.cards) || config.cards.length === 0) return false;
  return config.cards.every((c) =>
    isRecord(c) && !hasPicture(c) && v1Derivable(cardItem(c, config.cardMode), "card")
  );
}

/** Each card a content item; no `text`, `cardMode` or copied `content`. */
function writeCards(config: Config): Config {
  if (!cardsCanonicalOk(config)) return config;
  const next = without(config, ["cardMode", "content"]);
  next.cards = (config.cards as unknown[]).map((c) => toContentItemWrite(cardItem(c, config.cardMode)));
  if (next.targetLetter != null) next.targetLetter = singleRef(next.targetLetter);
  else delete next.targetLetter;
  if (next.prompt !== undefined) next.prompt = writePrompt(next.prompt);
  return next;
}

function cardsStoredOk(stored: Config): boolean {
  return !Array.isArray(stored.cards) || stored.cards.every((c) => !hasPicture(c));
}

function cardsHints(stored: Config, read: Config): Config {
  if (!Array.isArray(read.cards)) return read;
  const was = storedById(stored.cards);
  return {
    ...read,
    cards: read.cards.map((c) =>
      isRecord(c) ? withWordText(c, typeof c.text === "string" ? c.text : "", storedWordId(was.get(String(c.id)))) : c
    ),
  };
}

/** match_pairs a v1 can show from references: every side a letter, library word, numeral or audio clip. */
function pairsCanonicalOk(config: Config): boolean {
  if (!Array.isArray(config.pairs) || config.pairs.length === 0) return false;
  return config.pairs.every((p) =>
    isRecord(p) && v1Derivable(pairSideItem(p.left), "side") && v1Derivable(pairSideItem(p.right), "side")
  );
}

/**
 * match_pairs: each side a content item without an id (`ContentRefWriteSchema`),
 * no `type`, `value`, `audioUrl` or flat letter fields (the server writes them).
 */
function writeMatchPairs(config: Config): Config {
  if (!pairsCanonicalOk(config)) return config;
  const next = without(config, ["targetLetterAudioUrl", "targetLetterAudioId"]);
  next.pairs = (config.pairs as Config[]).map((p) => ({
    left: toContentRefWrite(pairSideItem(p.left)),
    right: toContentRefWrite(pairSideItem(p.right)),
  }));
  if (next.targetLetter != null) next.targetLetter = targetRefs(next.targetLetter);
  else delete next.targetLetter;
  if (next.prompt !== undefined) next.prompt = writePrompt(next.prompt);
  return next;
}

/** A side's display hints from the stored side: a word's text, a clip's URL. */
function sideHints(side: unknown, storedSide: unknown): unknown {
  if (!isRecord(side)) return side;
  const from = isRecord(storedSide) ? storedSide : {};
  if (side.kind === "word") {
    return withWordText(side, typeof side.value === "string" ? side.value : arabicOf(from.value), storedWordId(from));
  }
  if (side.kind === "audio" && isRecord(side.audio) && !side.audio.url) {
    const url = [side.audioUrl, from.audioUrl, from.value].find(filledText);
    return url ? { ...side, audio: { ...side.audio, url } } : side;
  }
  return side;
}

function pairsHints(stored: Config, read: Config): Config {
  if (!Array.isArray(read.pairs)) return read;
  const storedPairs = Array.isArray(stored.pairs) ? stored.pairs : [];
  return {
    ...read,
    pairs: read.pairs.map((p, n) => {
      const was = isRecord(storedPairs[n]) ? storedPairs[n] as Config : {};
      return isRecord(p) ? { ...p, left: sideHints(p.left, was.left), right: sideHints(p.right, was.right) } : p;
    }),
  };
}

/** The answer-set forms edit the hinted read (kinded items with their display hints); a save writes it. */
const asRead = (hinted: Config) => hinted;

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
  // letter mode, and word mode with a library word (CM-D3e); picture mode waits for the asset registry
  show_letter_or_word: {
    write: writeShow,
    canonicalOk: (config) => isLetterMode(config) || isShowLibraryWord(config),
    view: viewShow,
  },
  // letter mode only (word mode waits for a server-written v1 string)
  speech_practice: { write: writeSpeechLetter, canonicalOk: isLetterMode, keepAbsent: ["contentType"] },
  // answer sets (CM-S6, R2): every item one the server shows to v1 from its reference
  content_with_cards: { write: writeCards, canonicalOk: cardsCanonicalOk, storedOk: cardsStoredOk, hints: cardsHints, view: asRead },
  multiple_choice_question: { write: writeMcq, canonicalOk: mcqCanonicalOk, storedOk: mcqStoredOk, hints: mcqHints, view: asRead },
  match_pairs: { write: writeMatchPairs, canonicalOk: pairsCanonicalOk, hints: pairsHints, view: asRead },
  // reading types (CM-S12, backend CM-B35): v2 only, no v1 shape, references from the start
  read_and_match: { write: writeReadAndMatch, view: asRead },
  sentence_builder: { write: writeSentenceBuilder, view: asRead },
  sound_sort: { write: writeSoundSort, view: asRead },
};

/**
 * Converted types the server never sends to v1 (backend CM-B35,
 * `visibility.ts` `V2_ONLY_ACTIVITY_TYPES`): no v1 field to keep, and no
 * PROD row of them exists, so the CM-B31 v1-field check leaves them out.
 */
export const V2_ONLY_FORM_TYPES: readonly string[] = ["read_and_match", "sentence_builder", "sound_sort"];

/**
 * Types taken back to the shim because opening and saving a stored row would
 * change a field the v1 app reads (CM-B31, `v1Fields.test.ts`). They open
 * through the shim and save exactly as before. None today: match_pairs left
 * the list when the server began writing every side's `type`, `value` and
 * `audioUrl` from its reference (R2). Rows are also kept on the shim one by
 * one (`openForEdit`: an unreadable row, a word or picture mode, a trace
 * glyph whose form disagrees with `position`, an answer set holding a
 * picture or an item the server cannot show to v1).
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
 * `canonical: false` (a backend without canonical configs) opens every row
 * through the shim.
 */
export function openForEdit(
  type: string | undefined,
  stored: Config,
  options: { canonical?: boolean } = {},
): { config: Config; canonical: boolean } {
  const legacy = () => ({ config: normalizeActivityConfig(type, stored), canonical: false });
  // A backend that does not write v1's fields from references (PROD, `lib/backend/capabilities.ts`): every row on the shim.
  if (options.canonical === false) return legacy();
  if (!type || !stored || !isCanonicalFormType(type)) return legacy();
  if (Object.keys(stored).length === 0) return { config: stored, canonical: true };
  const entry = CANONICAL_FORM_TYPES[type];
  const read = readActivityConfig(type, stored);
  if (!read.success) return legacy();
  if (entry.storedOk && !entry.storedOk(stored)) return legacy();
  const hinted = entry.hints ? entry.hints(stored, read.config) : read.config;
  if (entry.canonicalOk && !entry.canonicalOk(hinted)) return legacy();
  const config = entry.view ? entry.view(hinted) : entry.write(hinted, type);
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
