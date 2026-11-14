/**
 * sound_blend config shape (SB-S1, TECH-DESIGN 1.1 and 1.5).
 *
 * The word-model fields shared with word_split_blend (`blendVersion`,
 * `wordRef`, `ending`, the client-only word edit and the save body split) live
 * in `lib/blendWord/config.ts`. This module names sound_blend's own fields and
 * its mapper onto the word model, aligned with the backend's save contract
 * (SB-B3, `core/contracts/sound-blend-save.ts`).
 *
 * - A config with `blendVersion: 2` takes the server's blend save path. Studio
 *   sends `wordRef`, `ending`, `stages` and the pass-through fields
 *   (`contentType`, `speed`, `requiredSlides`, `showBothSpeeds`,
 *   `transliteration`, `meaning`). The SERVER writes `word`, `segments`,
 *   `contentType`, `blendVersion` and `wordRef`; Studio writes no `segments`
 *   for these rows.
 * - A config without `blendVersion` is a legacy row and is stored as sent.
 */

import {
  CLIENT_WORD_EDIT_KEY,
  stampWordModelFields,
  type BlendWordConfig,
  type WordModelParts,
} from "../blendWord/config";

// ---------------------------------------------------------------------------
// Field values
// ---------------------------------------------------------------------------

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

export interface SoundBlendConfig extends BlendWordConfig {
  // LEGACY: unchanged meaning; v1 reads segments, speed, showBothSpeeds, requiredSlides.
  contentType?: BlendContentType;
  segments?: SoundSegment[];
  speed?: BlendSpeed;
  requiredSlides?: number;
  showBothSpeeds?: boolean;
  transliteration?: string;
  meaning?: string;

  // NEW, optional (the word-model fields are on BlendWordConfig).
  stages?: BlendStage[];
}

// ---------------------------------------------------------------------------
// Reading a config (tolerant of legacy rows)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Writing a config
// ---------------------------------------------------------------------------

/**
 * Stamp the v2 fields on a word config: the version, the word reference, the
 * ending and the stages. The server-owned `word` and `segments` are dropped:
 * the server derives them. Called when the author edits the word or a blend
 * setting, never on open, so an untouched legacy row is saved unchanged.
 */
export function stampBlendFields(
  config: SoundBlendConfig,
  parts: WordModelParts & { stages: readonly BlendStage[] },
): SoundBlendConfig {
  const next = stampWordModelFields<SoundBlendConfig>(
    { ...config, contentType: "word", stages: [...parts.stages] },
    parts,
  );
  delete next.word;
  delete next.segments;
  return next;
}

/** Letter mode has no word model: drop every v2 field. */
export function clearBlendFields(config: SoundBlendConfig): SoundBlendConfig {
  const next = { ...config };
  delete next.blendVersion;
  delete next.wordRef;
  delete next.ending;
  delete next.stages;
  delete next[CLIENT_WORD_EDIT_KEY];
  return next;
}
