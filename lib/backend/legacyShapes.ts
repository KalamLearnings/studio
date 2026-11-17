/**
 * The config a backend can store (the PROD gate, `lib/backend/capabilities.ts`).
 *
 * `prepareActivitySave` is the activity form's one save step: the canonical
 * cut (CM-S3), the blend body split (`wordBlendEdit`), then `toBackendShape`,
 * which writes the legacy (v1) shape for every capability the backend lacks.
 * With every capability on (backend `dev`) it changes nothing.
 *
 * Each step leaves a config without the dev-only fields exactly as it is, so a
 * legacy row that is opened and saved without an edit is sent back unchanged.
 * Pure, no React.
 *
 * Delete with `capabilities.ts` at the content-model release (its checklist).
 */

import { normaliseBlendText, splitBlendWord } from "@kalam/curriculum-schemas";
import { toSaveConfig } from "../activityConfig/canonical";
import {
  CLIENT_WORD_EDIT_KEY,
  isBlendV2,
  sourceWordText,
  toBlendSaveParts,
  type BlendWordConfig,
  type WordBlendEdit,
} from "../blendWord/config";
import type { SoundSegment } from "../soundBlend/config";
import { legacySegmentsFromSplit } from "../utils/soundBlend";
import type { BackendCapabilities } from "./capabilities";

export type Config = Record<string, unknown>;

const isRecord = (v: unknown): v is Config => typeof v === "object" && v !== null && !Array.isArray(v);
const filled = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

function without(config: Config, keys: readonly string[]): Config {
  if (!keys.some((k) => k in config)) return config;
  const next = { ...config };
  for (const k of keys) delete next[k];
  return next;
}

// ---------------------------------------------------------------------------
// sound_blend, word_split_blend (blendWordModel)
// ---------------------------------------------------------------------------

/** The word-model fields only backend `dev` reads on a blend config. */
const BLEND_V2_KEYS = ["blendVersion", "wordRef", "ending", "stages", "targetLetter", CLIENT_WORD_EDIT_KEY] as const;

/** v1's reading modes that show isolated letters (Studio and the server: `speed || 'segmented'`). */
function isolatedFor(speed: unknown): boolean {
  return speed === undefined || speed === null || speed === "segmented" || speed === "slow" || speed === "none";
}

/**
 * v1's `word` and `segments` for a sound_blend word, as the pre-v2 form wrote
 * them: the word as written (normalised) and one segment per letter from the
 * shared splitter (`legacySegmentsFromSplit`: 1 sukoon, 3 the letter opening a
 * long vowel, else 2), the isolated glyph in the segmented reading mode.
 */
export function legacySoundBlendWord(text: string, speed: unknown): { word: string; segments: SoundSegment[] } | null {
  const source = normaliseBlendText(text ?? "");
  if (!source) return null;
  const split = splitBlendWord(source, "full");
  return { word: split.text, segments: legacySegmentsFromSplit(split, isolatedFor(speed)) };
}

/**
 * A sound_blend config in v1's shape. A legacy row (no `blendVersion`) is
 * returned as it is. A word-mode v2 config gets `word` and `segments` from its
 * word reference's text (or its stored `word`); a letter-mode one keeps the
 * `word` glyph and `segments` the form wrote on the pick. Every v2 field goes.
 */
export function toLegacySoundBlend(config: Config): Config {
  const blend = config as BlendWordConfig & Config;
  if (!isBlendV2(blend) && !BLEND_V2_KEYS.some((k) => k in config)) return config;
  const next = without(config, BLEND_V2_KEYS);
  if ((config.contentType ?? "word") === "letter") return next;
  const v1 = legacySoundBlendWord(sourceWordText(blend), config.speed);
  if (v1) {
    next.word = v1.word;
    next.segments = v1.segments;
  }
  return next;
}

/**
 * A word_split_blend config in v1's shape: `word` (the hand-edited text, else
 * the reference's), `wordId` (the reference's library id while the text is the
 * reference's), and the chunks as the legacy editor holds them. Every v2 field
 * goes. A legacy row is returned as it is.
 */
export function toLegacyWordSplitBlend(config: Config): Config {
  if (!["blendVersion", "wordRef", "ending", CLIENT_WORD_EDIT_KEY].some((k) => k in config)) return config;
  const ref = isRecord(config.wordRef) ? config.wordRef : {};
  const next = without(config, ["blendVersion", "wordRef", "ending", CLIENT_WORD_EDIT_KEY]);
  const word = filled(config.word) ? config.word : filled(ref.text) ? ref.text : "";
  next.word = word;
  if (!filled(next.wordId) && filled(ref.wordId) && (!filled(config.word) || config.word === ref.text)) {
    next.wordId = ref.wordId;
  }
  return next;
}

// ---------------------------------------------------------------------------
// build_word_from_letters, show_letter_or_word, tap_letter_in_word (wordRefs)
// ---------------------------------------------------------------------------

/** The field v1 draws the word from, per type that sends `wordRef`. */
export const WORD_REF_TEXT_KEY: Readonly<Record<string, string>> = {
  build_word_from_letters: "targetWord",
  tap_letter_in_word: "targetWord",
  show_letter_or_word: "word",
};

/** No `wordRef`; the text v1 draws is the form's, else the reference's text. */
export function withoutWordRef(config: Config, textKey: string): Config {
  if (!("wordRef" in config)) return config;
  const ref = isRecord(config.wordRef) ? config.wordRef : {};
  const next = without(config, ["wordRef"]);
  if (!filled(next[textKey]) && filled(ref.text)) next[textKey] = ref.text;
  return next;
}

// ---------------------------------------------------------------------------
// multiple_choice_question, content_with_cards, match_pairs (answerSetRefs)
// ---------------------------------------------------------------------------

/** An entry without its library word reference (`word: { wordId }`); v1 reads its text. */
function withoutWordObject(entry: unknown): unknown {
  return isRecord(entry) && isRecord(entry.word) ? without(entry, ["word"]) : entry;
}

function mapList(config: Config, key: string, map: (entry: unknown) => unknown): Config {
  const list = config[key];
  if (!Array.isArray(list)) return config;
  const mapped = list.map(map);
  return mapped.some((e, i) => e !== list[i]) ? { ...config, [key]: mapped } : config;
}

/** No `prompt` and no item `word` references: only the fields v1 reads stay. */
export function withoutAnswerSetRefs(type: string, config: Config): Config {
  const next = without(config, ["prompt"]);
  switch (type) {
    case "multiple_choice_question":
      return mapList(next, "options", withoutWordObject);
    case "content_with_cards":
      return mapList(next, "cards", withoutWordObject);
    case "match_pairs":
      return mapList(next, "pairs", (p) => {
        if (!isRecord(p)) return p;
        const left = withoutWordObject(p.left);
        const right = withoutWordObject(p.right);
        return left === p.left && right === p.right ? p : { ...p, left, right };
      });
    default:
      return config;
  }
}

export const ANSWER_SET_TYPES: readonly string[] = ["multiple_choice_question", "content_with_cards", "match_pairs"];

// ---------------------------------------------------------------------------
// letter references (letterMadd, distractorContrast)
// ---------------------------------------------------------------------------

/** Every letter reference (an object with a `letterId`) without `madd`, at any depth. */
export function withoutLetterMadd<T>(value: T): T {
  if (Array.isArray(value)) {
    const mapped = value.map(withoutLetterMadd);
    return (mapped.some((e, i) => e !== value[i]) ? mapped : value) as T;
  }
  if (!isRecord(value)) return value;
  let changed = false;
  const next: Config = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === "madd" && typeof value.letterId === "string") {
      changed = true;
      continue;
    }
    const mapped = withoutLetterMadd(v);
    if (mapped !== v) changed = true;
    next[k] = mapped;
  }
  return (changed ? next : value) as T;
}

/** Distractor references without a picked `contrast`. */
export function withoutDistractorContrast(config: Config): Config {
  return mapList(config, "distractorLetters", (d) => (isRecord(d) && "contrast" in d ? without(d, ["contrast"]) : d));
}

// ---------------------------------------------------------------------------
// the save step
// ---------------------------------------------------------------------------

/** The config as a backend with these capabilities can store it (v1's shape for every one it lacks). */
export function toBackendShape(type: string | undefined, config: Config, caps: Readonly<BackendCapabilities>): Config {
  if (!type || !isRecord(config)) return config;
  let next = config;
  if (!caps.blendWordModel) {
    if (type === "sound_blend") next = toLegacySoundBlend(next);
    if (type === "word_split_blend") next = toLegacyWordSplitBlend(next);
  }
  if (!caps.wordRefs && WORD_REF_TEXT_KEY[type]) next = withoutWordRef(next, WORD_REF_TEXT_KEY[type]);
  if (!caps.answerSetRefs && ANSWER_SET_TYPES.includes(type)) next = withoutAnswerSetRefs(type, next);
  if (!caps.letterMadd) next = withoutLetterMadd(next);
  if (!caps.distractorContrast) next = withoutDistractorContrast(next);
  return next;
}

/**
 * What the activity form sends: the canonical cut where the backend writes
 * v1's fields (`toSaveConfig`), the blend word edit moved to the body's top
 * level where the backend takes it, and the backend's shape. A backend
 * without the blend word model never gets `wordBlendEdit` (backend `main`
 * passes unknown body keys to the row update, which has no such column).
 */
export function prepareActivitySave(
  type: string | undefined,
  config: Config,
  options: { canonical: boolean; caps: Readonly<BackendCapabilities> },
): { config: Config; wordBlendEdit?: WordBlendEdit } {
  const { caps } = options;
  const cut = toSaveConfig(type, config, options.canonical && caps.canonicalConfigs);
  const parts = toBlendSaveParts(type, cut);
  const shaped = toBackendShape(type, parts.config, caps);
  return parts.wordBlendEdit && caps.blendWordModel ? { config: shaped, wordBlendEdit: parts.wordBlendEdit } : { config: shaped };
}
