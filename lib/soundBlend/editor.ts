/**
 * sound_blend's word editor (SB-S1): the shared word editor
 * (`lib/blendWord/editor.ts`) bound to sound_blend's mapper, plus its own
 * settings (stages, the v1 reading mode).
 *
 * Each word edit returns the next config with the v2 fields stamped
 * (config.ts). The server derives `word` and `segments` for these rows, so
 * Studio writes neither. Opening a row changes nothing; only an edit does, and
 * an untouched legacy row saves exactly as before.
 */

import { isBlendV2 } from "../blendWord/config";
import { createWordEditor, currentEnding, wordModelParts } from "../blendWord/editor";
import type { WordPreview } from "../blendWord/preview";
import {
  resolveStages,
  stampBlendFields,
  type BlendSpeed,
  type BlendStage,
  type SoundBlendConfig,
  type SoundSegment,
} from "./config";
import { legacySegmentsFromSplit, remapSegmentForm } from "../utils/soundBlend";

export { currentEnding };

/** v1's segmented mode shows isolated letters; the other modes keep the word joined. */
export function usesIsolatedForms(speed: BlendSpeed | undefined): boolean {
  return !speed || speed === "segmented" || speed === "slow" || speed === "none";
}

/** sound_blend's word editor: every word edit keeps the activity's stages. */
export const soundBlendWordEditor = createWordEditor<SoundBlendConfig>((config, parts) =>
  stampBlendFields(config, { ...parts, stages: resolveStages(config) }),
);

export const {
  changeWord,
  changeEnding,
  changePseudo,
  changeOverride,
  splitFormUnit,
  mergeFormUnits,
  confirmHarakatSuggestion,
} = soundBlendWordEditor;

export function changeStages(config: SoundBlendConfig, stages: BlendStage[]): SoundBlendConfig {
  return stampBlendFields(config, { ...wordModelParts(config), stages });
}

/**
 * v1 reading mode. A legacy row re-maps its stored segments' glyphs (durations
 * stay); a v2 row only stores the speed, the server derives the segments.
 */
export function changeSpeed(config: SoundBlendConfig, speed: BlendSpeed): SoundBlendConfig {
  if (isBlendV2(config)) return { ...config, speed };
  const isolated = usesIsolatedForms(speed);
  return {
    ...config,
    speed,
    segments: (config.segments ?? []).map((s) => remapSegmentForm(s, isolated)),
  };
}

/**
 * What v1 will show, for display only (never saved). A v2 row: derived from
 * the splitter's split of the activity's form, as the server will. A legacy
 * row: its stored segments.
 */
export function previewV1Segments(config: SoundBlendConfig, preview: WordPreview | null): SoundSegment[] {
  if (!isBlendV2(config)) return config.segments ?? [];
  if (!preview) return [];
  return legacySegmentsFromSplit(preview[currentEnding(config)].split, usesIsolatedForms(config.speed));
}
