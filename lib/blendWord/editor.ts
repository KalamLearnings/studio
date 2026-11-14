/**
 * The word editor's state changes (SB-S1, SB-S2), as pure functions of the
 * config, shared by every blend activity on the word model.
 *
 * Each word edit returns the next config with the v2 fields stamped by the
 * activity type's mapper (`StampWordModel`): sound_blend adds its stages and
 * drops `segments`, word_split_blend drops sound_blend's fields. The server
 * derives the v1 fields of these rows. Opening a row changes nothing; only an
 * edit does, and an untouched legacy row saves exactly as before.
 */

import { normaliseBlendText } from "@kalam/curriculum-schemas";
import {
  CLIENT_WORD_EDIT_KEY,
  HARAKAT_SOURCE_SUGGESTED_CONFIRMED,
  resolveEnding,
  sourceWordText,
  wordEditOf,
  type BlendEnding,
  type BlendOverrideUnit,
  type BlendWordConfig,
  type BlendWordRef,
  type WordBlendEdit,
  type WordModelParts,
} from "./config";
import { buildWordPreview, inferEndingFromText } from "./preview";
import { mergeWithNext, sameUnits, splitUnit, toOverrideUnits } from "./override";

/** The type's mapper: writes the word-model parts and the type's own v2 fields. */
export type StampWordModel<C extends BlendWordConfig> = (config: C, parts: WordModelParts) => C;

/** The ending the form shows for this config (a legacy row: inferred from its text). */
export function currentEnding(config: BlendWordConfig): BlendEnding {
  return resolveEnding(config, inferEndingFromText);
}

/** A change to the word-model parts; anything left out keeps its current value. */
export interface WordModelPatch {
  text?: string;
  /** A new id, or null to drop it (a typed word). */
  wordId?: string | null;
  ending?: BlendEnding;
  wordBlendEdit?: WordBlendEdit;
}

/** The word-model parts of a config after a patch. */
export function wordModelParts(config: BlendWordConfig, patch: WordModelPatch = {}): WordModelParts {
  const text = patch.text ?? sourceWordText(config);
  const wordId = patch.wordId === null ? undefined : patch.wordId ?? config.wordRef?.wordId;
  const wordRef: BlendWordRef | undefined =
    text || wordId ? { ...(wordId ? { wordId } : {}), ...(text ? { text } : {}) } : undefined;
  return {
    wordRef,
    ending: patch.ending ?? currentEnding(config),
    wordBlendEdit: patch.wordBlendEdit ?? wordEditOf(config),
  };
}

export interface WordEditor<C extends BlendWordConfig> {
  /** Stamp the v2 fields with a patch (an empty patch converts a legacy row as it reads). */
  commit(config: C, patch?: WordModelPatch): C;
  changeWord(config: C, text: string, libraryWord?: { id: string; is_pseudo?: boolean | null }): C;
  changeEnding(config: C, ending: BlendEnding): C;
  changePseudo(config: C, isPseudo: boolean): C;
  changeOverride(config: C, form: BlendEnding, units: BlendOverrideUnit[] | null): C;
  splitFormUnit(config: C, form: BlendEnding, index: number, at: number): C;
  mergeFormUnits(config: C, form: BlendEnding, index: number): C;
  confirmHarakatSuggestion(config: C, fullText: string): C;
}

/** The word editor of one activity type, bound to its mapper. */
export function createWordEditor<C extends BlendWordConfig>(stamp: StampWordModel<C>): WordEditor<C> {
  const commit = (config: C, patch: WordModelPatch = {}): C => stamp(config, wordModelParts(config, patch));

  /**
   * A new word, typed or picked from the library. A new word drops the
   * previous word's override; the pseudo flag comes from the library row.
   * Giving a pausal-only word its full form is also a new word: its full text,
   * sent without a `wordId`, becomes a library word of its own on the server.
   */
  const changeWord: WordEditor<C>["changeWord"] = (config, text, libraryWord) =>
    commit(config, {
      text,
      wordId: libraryWord ? libraryWord.id : null,
      wordBlendEdit: { isPseudo: !!libraryWord?.is_pseudo },
    });

  const changePseudo: WordEditor<C>["changePseudo"] = (config, isPseudo) =>
    commit(config, { wordBlendEdit: { ...wordEditOf(config), isPseudo } });

  /**
   * Set (or with null, clear) the override of one form. An override equal to
   * the splitter's own split is no override.
   */
  const changeOverride: WordEditor<C>["changeOverride"] = (config, form, units) => {
    const edit = wordEditOf(config);
    const preview = buildWordPreview(sourceWordText(config), edit);
    const own = preview[form].split.units;
    const override = { ...edit?.override };
    if (!units || sameUnits(units, own)) delete override[form];
    else override[form] = units;
    return commit(config, { wordBlendEdit: { ...edit, override } });
  };

  /** The units an override edit starts from: the current override, else the splitter's. */
  const overrideBase = (config: C, form: BlendEnding): BlendOverrideUnit[] => {
    const current = wordEditOf(config)?.override?.[form];
    if (current && current.length > 0) return current;
    const preview = buildWordPreview(sourceWordText(config), wordEditOf(config));
    return toOverrideUnits(preview[form].split.units);
  };

  /**
   * Applies a confirmed harakat reading (SB-S2): its full form becomes the
   * word's text, sent as `wordRef.text` without a `wordId` (as "Use as the
   * word"), so the server resolves or creates the library word and splits it
   * on save. The pseudo-word flag is kept; any override is dropped (it was for
   * the old text). The edit is marked `harakatSource: 'suggested_confirmed'`.
   */
  const confirmHarakatSuggestion: WordEditor<C>["confirmHarakatSuggestion"] = (config, fullText) => {
    const text = normaliseBlendText(fullText);
    if (!text || text === normaliseBlendText(sourceWordText(config))) return config;
    const wasPseudo = !!wordEditOf(config)?.isPseudo;
    const changed = changeWord(config, text);
    const next = wasPseudo ? changePseudo(changed, true) : changed;
    return {
      ...next,
      [CLIENT_WORD_EDIT_KEY]: { ...wordEditOf(next), harakatSource: HARAKAT_SOURCE_SUGGESTED_CONFIRMED },
    };
  };

  return {
    commit,
    changeWord,
    changeEnding: (config, ending) => commit(config, { ending }),
    changePseudo,
    changeOverride,
    /** Override: split unit `index` of a form after its `at`-th letter. */
    splitFormUnit: (config, form, index, at) =>
      changeOverride(config, form, splitUnit(overrideBase(config, form), index, at)),
    /** Override: merge unit `index` of a form with the next one. */
    mergeFormUnits: (config, form, index) =>
      changeOverride(config, form, mergeWithNext(overrideBase(config, form), index)),
    confirmHarakatSuggestion,
  };
}
