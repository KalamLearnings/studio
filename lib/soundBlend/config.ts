/**
 * sound_blend config shape (SB-S1, TECH-DESIGN 1.1 and 1.5).
 *
 * This is the ONE Studio module that names the fields the sound_blend form
 * writes. The backend's Zod schema for them lands in SB-B3; when it does, align
 * the names and shapes here and nowhere else.
 *
 * Legacy fields keep their meaning so v1 renders exactly as today. The new
 * fields are all optional: a row with none of them is a legacy row.
 *
 * ASSUMPTION (until SB-B3 merges): the word-level choices (the pseudo-word
 * flag, the full form, a split override) travel with the activity save under
 * `wordBlendEdit`. The backend reads it, writes `curriculum_words` and
 * `curriculum_word_blend`, and strips it from the stored config. The activity
 * itself keeps no split (TECH-DESIGN 1.1, "No split in the activity").
 */

import type { BlendUnitTag } from "@kalam/curriculum-schemas";

// ---------------------------------------------------------------------------
// Field values
// ---------------------------------------------------------------------------

/** The config version that marks a row written by the v2 word editor. */
export const BLEND_CONFIG_VERSION = 2 as const;

export type BlendEnding = "pausal" | "full";
export const BLEND_ENDINGS: readonly BlendEnding[] = ["pausal", "full"];
export const DEFAULT_ENDING: BlendEnding = "pausal";

export type BlendStage = "model" | "together" | "togetherFast" | "alone" | "fade";
/** The only order stages may run in (TECH-DESIGN 4.2). */
export const BLEND_STAGE_ORDER: readonly BlendStage[] = [
  "model",
  "together",
  "togetherFast",
  "alone",
  "fade",
];
/** Always present: the D2 pair. */
export const REQUIRED_STAGES: readonly BlendStage[] = ["together", "alone"];
/** A new activity: the together slide, then the alone slide. */
export const DEFAULT_STAGES: readonly BlendStage[] = ["together", "alone"];

export type BlendSpeed = "none" | "slow" | "fast" | "segmented" | "blended" | "fluent";
export type BlendContentType = "letter" | "word";
export type SoundDuration = 1 | 2 | 3;

export interface SoundSegment {
  sound: string;
  duration: SoundDuration;
}

/** `WordReference` of CONTENT_ITEM_DESIGN.md. A typed new word has no `wordId` yet. */
export interface SoundBlendWordRef {
  wordId?: string;
  text: string;
}

/** One unit of an author's override: the spelling and the tags. */
export interface BlendOverrideUnit {
  text: string;
  tags: BlendUnitTag[];
}

/** Word-level choices sent with the save (ASSUMPTION, see the header). */
export interface WordBlendEdit {
  /** `curriculum_words.is_pseudo`. */
  isPseudo?: boolean;
  /** The full form, when the word field holds the pausal form only. */
  fullText?: string;
  /** Per-form overrides of the split; saved as `override: true`, needs review. */
  override?: Partial<Record<BlendEnding, BlendOverrideUnit[]>>;
}

export interface SoundBlendConfig {
  // LEGACY: unchanged meaning; v1 reads segments, speed, showBothSpeeds, requiredSlides.
  contentType?: BlendContentType;
  word?: string;
  segments?: SoundSegment[];
  speed?: BlendSpeed;
  requiredSlides?: number;
  showBothSpeeds?: boolean;
  transliteration?: string;
  meaning?: string;

  // NEW, all optional.
  blendVersion?: typeof BLEND_CONFIG_VERSION;
  wordRef?: SoundBlendWordRef;
  ending?: BlendEnding;
  stages?: BlendStage[];
  wordBlendEdit?: WordBlendEdit;
}

// ---------------------------------------------------------------------------
// Reading a config (tolerant of legacy rows)
// ---------------------------------------------------------------------------

/** The word text the author works on: the reference's text, else the legacy `word`. */
export function sourceWordText(config: SoundBlendConfig | undefined): string {
  return config?.wordRef?.text ?? config?.word ?? "";
}

/**
 * The activity's ending. A row without `ending` reads as the default. The
 * migration (TECH-DESIGN 2.9) sets legacy rows from the text they show; the form
 * only shows that inference, it does not write it until the author edits.
 */
export function resolveEnding(
  config: SoundBlendConfig | undefined,
  inferFromText?: (text: string) => BlendEnding,
): BlendEnding {
  if (config?.ending === "pausal" || config?.ending === "full") return config.ending;
  const text = sourceWordText(config);
  if (!config?.blendVersion && text && inferFromText) return inferFromText(text);
  return DEFAULT_ENDING;
}

/**
 * The stages the activity plays. A valid stored list wins. Otherwise the
 * defaults of TECH-DESIGN 4.3: a legacy `showBothSpeeds` row gets three slides
 * (together, together fast, alone); every other row gets the together/alone pair.
 */
export function resolveStages(config: SoundBlendConfig | undefined): BlendStage[] {
  if (config?.stages && validateStages(config.stages).length === 0) return [...config.stages];
  if (!config?.blendVersion && config?.showBothSpeeds) return ["together", "togetherFast", "alone"];
  return [...DEFAULT_STAGES];
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

/** Plain-words problems with a stage list; empty when it is valid. */
export function validateStages(stages: readonly string[]): string[] {
  const problems: string[] = [];
  const known = new Set<string>(BLEND_STAGE_ORDER);
  for (const s of stages) {
    if (!known.has(s)) problems.push(`"${s}" is not a stage.`);
  }
  if (new Set(stages).size !== stages.length) problems.push("A stage is listed twice.");
  for (const required of REQUIRED_STAGES) {
    if (!stages.includes(required)) problems.push(`The "${STAGE_LABELS[required].label}" slide is required.`);
  }
  const together = stages.indexOf("together");
  const alone = stages.indexOf("alone");
  if (together >= 0 && alone >= 0 && together > alone) {
    problems.push("The together slide must come before the alone slide.");
  }
  const order = stages
    .filter((s) => known.has(s))
    .map((s) => BLEND_STAGE_ORDER.indexOf(s as BlendStage));
  if (order.some((v, i) => i > 0 && v < (order[i - 1] ?? 0))) {
    problems.push("Stages run in the order: model, together, together fast, alone, fade.");
  }
  return problems;
}

/** Turn an optional stage on or off; the required pair stays, the order is fixed. */
export function toggleStage(stages: readonly BlendStage[], stage: BlendStage, on: boolean): BlendStage[] {
  if (REQUIRED_STAGES.includes(stage)) return BLEND_STAGE_ORDER.filter((s) => stages.includes(s) || REQUIRED_STAGES.includes(s));
  const set = new Set<BlendStage>(stages);
  if (on) set.add(stage);
  else set.delete(stage);
  for (const r of REQUIRED_STAGES) set.add(r);
  return BLEND_STAGE_ORDER.filter((s) => set.has(s));
}

export const STAGE_LABELS: Record<BlendStage, { label: string; hint: string; required: boolean }> = {
  model: { label: "Model", hint: "The app slides by itself while the word plays.", required: false },
  together: { label: "Together", hint: "The audio follows the child's finger (tortoise).", required: true },
  togetherFast: { label: "Together, fast", hint: "The joined word; the audio follows at near natural speed (hare).", required: false },
  alone: { label: "Alone", hint: "A silent slide; the whole word plays after the release.", required: true },
  fade: { label: "Fade", hint: "No slider: the child taps to hear the word.", required: false },
};

export const ENDING_LABELS: Record<BlendEnding, { label: string; hint: string }> = {
  pausal: { label: "Pausal", hint: "Stop on the last letter (كِتَابْ). For early lessons." },
  full: { label: "Full", hint: "With the case ending or tanween (كِتَابٌ). From the tanween lesson on." },
};

// ---------------------------------------------------------------------------
// Writing a config
// ---------------------------------------------------------------------------

/** Drop empty parts of the word-level edit so a clean row carries none. */
export function compactWordBlendEdit(edit: WordBlendEdit | undefined): WordBlendEdit | undefined {
  if (!edit) return undefined;
  const out: WordBlendEdit = {};
  if (edit.isPseudo) out.isPseudo = true;
  if (edit.fullText && edit.fullText.trim()) out.fullText = edit.fullText.trim();
  const override: WordBlendEdit["override"] = {};
  for (const form of BLEND_ENDINGS) {
    const units = edit.override?.[form];
    if (units && units.length > 0) override[form] = units;
  }
  if (Object.keys(override).length > 0) out.override = override;
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Stamp the v2 fields on a word config: the version, the word reference, the
 * ending and the stages. Called when the author edits the word or a blend
 * setting, never on open, so an untouched legacy row is saved unchanged.
 */
export function stampBlendFields(
  config: SoundBlendConfig,
  parts: {
    wordRef: SoundBlendWordRef | undefined;
    ending: BlendEnding;
    stages: readonly BlendStage[];
    wordBlendEdit: WordBlendEdit | undefined;
  },
): SoundBlendConfig {
  const next: SoundBlendConfig = {
    ...config,
    blendVersion: BLEND_CONFIG_VERSION,
    ending: parts.ending,
    stages: [...parts.stages],
  };
  if (parts.wordRef && parts.wordRef.text) next.wordRef = parts.wordRef;
  else delete next.wordRef;
  const edit = compactWordBlendEdit(parts.wordBlendEdit);
  if (edit) next.wordBlendEdit = edit;
  else delete next.wordBlendEdit;
  return next;
}

/** Letter mode has no word model: drop every v2 field. */
export function clearBlendFields(config: SoundBlendConfig): SoundBlendConfig {
  const next = { ...config };
  delete next.blendVersion;
  delete next.wordRef;
  delete next.ending;
  delete next.stages;
  delete next.wordBlendEdit;
  return next;
}
