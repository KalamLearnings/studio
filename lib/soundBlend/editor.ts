/**
 * The word editor's state changes (SB-S1), as pure functions of the config.
 *
 * Each edit returns the next config: the v2 fields stamped (config.ts), and the
 * legacy `segments` rewritten from the shared splitter so v1 keeps rendering
 * (until SB-B3 derives them on the server). Opening a row changes nothing; only
 * an edit does.
 */

import {
  resolveEnding,
  resolveStages,
  sourceWordText,
  stampBlendFields,
  type BlendEnding,
  type BlendOverrideUnit,
  type BlendSpeed,
  type BlendStage,
  type SoundBlendConfig,
  type WordBlendEdit,
} from "./config";
import { buildWordPreview, inferEndingFromText } from "./preview";
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

/** The word-level edit, with the ending/stages read through the defaults. */
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
  const ending = patch.ending ?? currentEnding(config);
  const stages = patch.stages ?? resolveStages(config);
  const wordBlendEdit = patch.wordBlendEdit ?? config.wordBlendEdit;

  const preview = buildWordPreview(text, wordBlendEdit);
  const split = preview[ending].split;
  const segments = text ? legacySegmentsFromSplit(split, usesIsolatedForms(config.speed)) : [];

  return stampBlendFields(
    { ...config, contentType: "word", word: text, segments },
    { wordRef: text ? { ...(wordId ? { wordId } : {}), text } : undefined, ending, stages, wordBlendEdit },
  );
}

/**
 * A new word, typed or picked from the library. A new word drops the previous
 * word's override and full form; the pseudo flag comes from the library row.
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
  return commit(config, { wordBlendEdit: { ...config.wordBlendEdit, isPseudo } });
}

/** The full form, typed when the word field holds only the pausal form. Clears a full-form override. */
export function changeFullText(config: SoundBlendConfig, fullText: string): SoundBlendConfig {
  const override = { ...config.wordBlendEdit?.override };
  delete override.full;
  delete override.pausal;
  return commit(config, { wordBlendEdit: { ...config.wordBlendEdit, fullText, override } });
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
  const preview = buildWordPreview(sourceWordText(config), config.wordBlendEdit);
  const own = preview[form].split.units;
  const override = { ...config.wordBlendEdit?.override };
  if (!units || sameUnits(units, own)) delete override[form];
  else override[form] = units;
  return commit(config, { wordBlendEdit: { ...config.wordBlendEdit, override } });
}

/** The units an override edit starts from: the current override, else the splitter's. */
function overrideBase(config: SoundBlendConfig, form: BlendEnding): BlendOverrideUnit[] {
  const current = config.wordBlendEdit?.override?.[form];
  if (current && current.length > 0) return current;
  const preview = buildWordPreview(sourceWordText(config), config.wordBlendEdit);
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

/** v1 reading mode: only the glyph forms of the segments change; durations stay. */
export function changeSpeed(config: SoundBlendConfig, speed: BlendSpeed): SoundBlendConfig {
  const isolated = usesIsolatedForms(speed);
  return {
    ...config,
    speed,
    segments: (config.segments ?? []).map((s) => remapSegmentForm(s, isolated)),
  };
}
