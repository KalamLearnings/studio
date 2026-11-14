/**
 * The word editor's state changes (SB-S1), as pure functions of the config.
 *
 * Each word edit returns the next config with the v2 fields stamped
 * (config.ts). The server derives `word` and `segments` for these rows, so
 * Studio writes neither. Opening a row changes nothing; only an edit does, and
 * an untouched legacy row saves exactly as before.
 */

import {
  isBlendV2,
  resolveEnding,
  resolveStages,
  sourceWordText,
  stampBlendFields,
  wordEditOf,
  type BlendEnding,
  type BlendOverrideUnit,
  type BlendSpeed,
  type BlendStage,
  type SoundBlendConfig,
  type SoundSegment,
  type WordBlendEdit,
} from "./config";
import { buildWordPreview, inferEndingFromText, type WordPreview } from "./preview";
import { mergeWithNext, sameUnits, splitUnit, toOverrideUnits } from "./override";
import { legacySegmentsFromSplit, remapSegmentForm } from "../utils/soundBlend";

/** v1's segmented mode shows isolated letters; the other modes keep the word joined. */
export function usesIsolatedForms(speed: BlendSpeed | undefined): boolean {
  return !speed || speed === "segmented" || speed === "slow" || speed === "none";
}

/** The ending the form shows for this config (a legacy row: inferred from its text). */
export function currentEnding(config: SoundBlendConfig): BlendEnding {
  return resolveEnding(config, inferEndingFromText);
}

function commit(
  config: SoundBlendConfig,
  patch: {
    text?: string;
    wordId?: string | null;
    ending?: BlendEnding;
    stages?: BlendStage[];
    wordBlendEdit?: WordBlendEdit;
  },
): SoundBlendConfig {
  const text = patch.text ?? sourceWordText(config);
  const wordId = patch.wordId === null ? undefined : patch.wordId ?? config.wordRef?.wordId;
  return stampBlendFields(config, {
    wordRef: text || wordId ? { ...(wordId ? { wordId } : {}), ...(text ? { text } : {}) } : undefined,
    ending: patch.ending ?? currentEnding(config),
    stages: patch.stages ?? resolveStages(config),
    wordBlendEdit: patch.wordBlendEdit ?? wordEditOf(config),
  });
}

/**
 * A new word, typed or picked from the library. A new word drops the previous
 * word's override; the pseudo flag comes from the library row. Giving a
 * pausal-only word its full form is also a new word: its full text, sent
 * without a `wordId`, becomes a library word of its own on the server.
 */
export function changeWord(
  config: SoundBlendConfig,
  text: string,
  libraryWord?: { id: string; is_pseudo?: boolean | null },
): SoundBlendConfig {
  return commit(config, {
    text,
    wordId: libraryWord ? libraryWord.id : null,
    wordBlendEdit: { isPseudo: !!libraryWord?.is_pseudo },
  });
}

export function changeEnding(config: SoundBlendConfig, ending: BlendEnding): SoundBlendConfig {
  return commit(config, { ending });
}

export function changeStages(config: SoundBlendConfig, stages: BlendStage[]): SoundBlendConfig {
  return commit(config, { stages });
}

export function changePseudo(config: SoundBlendConfig, isPseudo: boolean): SoundBlendConfig {
  return commit(config, { wordBlendEdit: { ...wordEditOf(config), isPseudo } });
}

/**
 * Set (or with null, clear) the override of one form. An override equal to the
 * splitter's own split is no override.
 */
export function changeOverride(
  config: SoundBlendConfig,
  form: BlendEnding,
  units: BlendOverrideUnit[] | null,
): SoundBlendConfig {
  const edit = wordEditOf(config);
  const preview = buildWordPreview(sourceWordText(config), edit);
  const own = preview[form].split.units;
  const override = { ...edit?.override };
  if (!units || sameUnits(units, own)) delete override[form];
  else override[form] = units;
  return commit(config, { wordBlendEdit: { ...edit, override } });
}

/** The units an override edit starts from: the current override, else the splitter's. */
function overrideBase(config: SoundBlendConfig, form: BlendEnding): BlendOverrideUnit[] {
  const current = wordEditOf(config)?.override?.[form];
  if (current && current.length > 0) return current;
  const preview = buildWordPreview(sourceWordText(config), wordEditOf(config));
  return toOverrideUnits(preview[form].split.units);
}

/** Override: split unit `index` of a form after its `at`-th letter. */
export function splitFormUnit(config: SoundBlendConfig, form: BlendEnding, index: number, at: number): SoundBlendConfig {
  return changeOverride(config, form, splitUnit(overrideBase(config, form), index, at));
}

/** Override: merge unit `index` of a form with the next one. */
export function mergeFormUnits(config: SoundBlendConfig, form: BlendEnding, index: number): SoundBlendConfig {
  return changeOverride(config, form, mergeWithNext(overrideBase(config, form), index));
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
