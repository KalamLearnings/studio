/**
 * The blend word model shared by `sound_blend` and `word_split_blend`
 * (SB-S1, SB-B3, SB-B10, ADR 0078).
 *
 * This module names the fields every blend activity on the word model writes,
 * aligned with the backend's save contract (`core/contracts/sound-blend-save.ts`).
 * The type-specific fields (sound_blend's stages and speed, word_split_blend's
 * chunks) live in `lib/soundBlend/config.ts` and `lib/wordSplitBlend/config.ts`.
 *
 * - A config with `blendVersion: 2` takes the server's blend save path. Studio
 *   sends `wordRef` and `ending` (and the type's own settings). The SERVER
 *   resolves the word, splits it and writes the derived v1 fields.
 * - A config without `blendVersion` is a legacy row and is stored as sent.
 * - Word-level choices (`wordBlendEdit`: the pseudo-word flag, split overrides
 *   and `harakatSource`) go at the TOP LEVEL of the request body, beside
 *   `config`, never inside it, and only with `blendVersion: 2`. While the
 *   author edits, Studio keeps them in the local config under a client-only
 *   key, and `toBlendSaveParts` moves them out before the save.
 * - A word's full form is its library text. A pausal-only word gets its full
 *   form by sending the full text as `wordRef.text` (a new library word).
 */

import type { BlendUnitTag } from "@kalam/curriculum-schemas";

// ---------------------------------------------------------------------------
// Field values
// ---------------------------------------------------------------------------

/** The config version that marks a row on the word model. */
export const BLEND_CONFIG_VERSION = 2 as const;

/** The activity types that save through the word model with `blendVersion: 2`. */
export const BLEND_ACTIVITY_TYPES = ["sound_blend", "word_split_blend"] as const;
export type BlendActivityType = (typeof BLEND_ACTIVITY_TYPES)[number];

export function isBlendActivityType(type: string | undefined): type is BlendActivityType {
  return !!type && (BLEND_ACTIVITY_TYPES as readonly string[]).includes(type);
}

export type BlendEnding = "pausal" | "full";
export const BLEND_ENDINGS: readonly BlendEnding[] = ["pausal", "full"];
export const DEFAULT_ENDING: BlendEnding = "pausal";

export const ENDING_LABELS: Record<BlendEnding, { label: string; hint: string }> = {
  pausal: { label: "Pausal", hint: "Stop on the last letter (كِتَابْ). For early lessons." },
  full: { label: "Full", hint: "With the case ending or tanween (كِتَابٌ). From the tanween lesson on." },
};

/**
 * `WordReference` of CONTENT_ITEM_DESIGN.md: at least one of the two. `wordId`
 * is authoritative; a text alone is looked up or created on the server.
 */
export interface BlendWordRef {
  wordId?: string;
  text?: string;
}

/** One unit of an author's override: the spelling and the tags. */
export interface BlendOverrideUnit {
  text: string;
  tags: BlendUnitTag[];
}

/** `wordBlendEdit.harakatSource`: the backend accepts only this value. */
export type HarakatSource = "suggested_confirmed";
export const HARAKAT_SOURCE_SUGGESTED_CONFIRMED: HarakatSource = "suggested_confirmed";

/** Word-level choices, sent beside `config` in the save body (see the header). */
export interface WordBlendEdit {
  /** `curriculum_words.is_pseudo`. */
  isPseudo?: boolean;
  /** Per-form overrides of the split; saved as `override: true`, needs review. */
  override?: Partial<Record<BlendEnding, BlendOverrideUnit[]>>;
  /**
   * Set when the word's text is a harakat suggestion the author confirmed
   * (SB-S2); stored as the blend rows' `harakat_source`. The only value the
   * server accepts. A new word, typed or picked, clears it.
   */
  harakatSource?: HarakatSource;
}

/** The client-only config key that holds the word edit until the save. Never sent in `config`. */
export const CLIENT_WORD_EDIT_KEY = "__wordBlendEdit" as const;

/** The word-model fields every blend config may carry. */
export interface BlendWordConfig {
  /** LEGACY (and server-written on v2 rows): the text the row shows. */
  word?: string;
  blendVersion?: typeof BLEND_CONFIG_VERSION;
  wordRef?: BlendWordRef;
  ending?: BlendEnding;
  /** CLIENT-ONLY: moved to the request body's top level by `toBlendSaveParts`. */
  [CLIENT_WORD_EDIT_KEY]?: WordBlendEdit;
}

// ---------------------------------------------------------------------------
// Reading a config (tolerant of legacy rows)
// ---------------------------------------------------------------------------

/** The word text the author works on: the reference's text, else the legacy `word`. */
export function sourceWordText(config: BlendWordConfig | undefined): string {
  return config?.wordRef?.text ?? config?.word ?? "";
}

/** The author's word-level edit held in the local config. */
export function wordEditOf(config: BlendWordConfig | undefined): WordBlendEdit | undefined {
  return config?.[CLIENT_WORD_EDIT_KEY];
}

/** True for a row the server's blend save path owns. */
export function isBlendV2(config: BlendWordConfig | undefined): boolean {
  return config?.blendVersion === BLEND_CONFIG_VERSION;
}

/**
 * The activity's ending. A row without `ending` reads as the default. A legacy
 * row may be inferred from the text it shows; the form only shows that
 * inference, it does not write it until the author edits.
 */
export function resolveEnding(
  config: BlendWordConfig | undefined,
  inferFromText?: (text: string) => BlendEnding,
): BlendEnding {
  if (config?.ending === "pausal" || config?.ending === "full") return config.ending;
  const text = sourceWordText(config);
  if (!config?.blendVersion && text && inferFromText) return inferFromText(text);
  return DEFAULT_ENDING;
}

// ---------------------------------------------------------------------------
// Writing a config
// ---------------------------------------------------------------------------

/** Drop empty parts of the word-level edit so a clean row carries none. */
export function compactWordBlendEdit(edit: WordBlendEdit | undefined): WordBlendEdit | undefined {
  if (!edit) return undefined;
  const out: WordBlendEdit = {};
  if (edit.isPseudo) out.isPseudo = true;
  const override: WordBlendEdit["override"] = {};
  for (const form of BLEND_ENDINGS) {
    const units = edit.override?.[form];
    if (units && units.length > 0) override[form] = units;
  }
  if (Object.keys(override).length > 0) out.override = override;
  if (edit.harakatSource === HARAKAT_SOURCE_SUGGESTED_CONFIRMED) out.harakatSource = edit.harakatSource;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** The word-model parts of a v2 config, as the word editor sets them. */
export interface WordModelParts {
  wordRef: BlendWordRef | undefined;
  ending: BlendEnding;
  wordBlendEdit: WordBlendEdit | undefined;
}

/**
 * Stamp the word-model fields on a config: the version, the word reference,
 * the ending and the client-only word edit. The type's mapper adds or drops
 * its own fields around this.
 */
export function stampWordModelFields<C extends BlendWordConfig>(config: C, parts: WordModelParts): C {
  const next: C = { ...config, blendVersion: BLEND_CONFIG_VERSION, ending: parts.ending };
  if (parts.wordRef && (parts.wordRef.wordId || parts.wordRef.text)) next.wordRef = parts.wordRef;
  else delete next.wordRef;
  const edit = compactWordBlendEdit(parts.wordBlendEdit);
  if (edit) next[CLIENT_WORD_EDIT_KEY] = edit;
  else delete next[CLIENT_WORD_EDIT_KEY];
  return next;
}

/**
 * Split a config into the save body's parts: the `config` to send and the
 * top-level `wordBlendEdit`. The client-only key never leaves in `config`, and
 * a word edit is sent only with `blendVersion: 2` (the server refuses it
 * otherwise). Any other activity type passes through.
 */
export function toBlendSaveParts(
  activityType: string | undefined,
  config: Record<string, unknown>,
): { config: Record<string, unknown>; wordBlendEdit?: WordBlendEdit } {
  if (!isBlendActivityType(activityType) || !(CLIENT_WORD_EDIT_KEY in config)) return { config };
  const { [CLIENT_WORD_EDIT_KEY]: edit, ...rest } = config as BlendWordConfig & Record<string, unknown>;
  const wordBlendEdit = isBlendV2(rest) ? compactWordBlendEdit(edit as WordBlendEdit | undefined) : undefined;
  return wordBlendEdit ? { config: rest, wordBlendEdit } : { config: rest };
}
