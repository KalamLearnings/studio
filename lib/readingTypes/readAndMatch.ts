/**
 * `read_and_match` in Studio (CM-S12; backend CM-B35, ADR 0002): the child
 * reads a phrase or sentence and taps the one picture that matches it.
 * The form keeps the options as editor items (with display hints); the save
 * writes references only. Pure.
 */

import { toContentItemWrite, type EditorItem } from "../activityConfig/contentItems";
import { isFilled } from "../activityConfig/contentItems";
import {
  editorItems,
  nextId,
  referenceKey,
  sharedOptional,
  unreferencedProblem,
  writePhrase,
  type Config,
} from "./common";

/** The schema's bounds (`read_and_match.ts`; the package does not export them). */
export const READ_AND_MATCH_MIN_OPTIONS = 2;
export const READ_AND_MATCH_MAX_OPTIONS = 4;
const DEFAULT_OPTIONS = 3;

/** The options the form shows: the stored ones, else three empty pictures. */
export function readAndMatchOptions(config: Config | undefined): EditorItem[] {
  const stored = editorItems(config?.options);
  if (stored.length > 0) return stored;
  const out: EditorItem[] = [];
  for (let i = 0; i < DEFAULT_OPTIONS; i += 1) out.push({ id: nextId("o", out.map((o) => o.id)), kind: "image" });
  return out;
}

/** One more empty picture option, with a fresh id. */
export function addOption(options: readonly EditorItem[]): EditorItem[] {
  return [...options, { id: nextId("o", options.map((o) => o.id)), kind: "image" }];
}

/** Marks option `index` the one correct picture; the others become wrong. */
export function markCorrect(options: readonly EditorItem[], index: number): EditorItem[] {
  return options.map((o, i) => ({ ...o, isCorrect: i === index }));
}

/**
 * What stops the options from saving, in plain language (the write schema
 * and the server's `distractors_differ`). The phrase's own problems are the
 * phrase builder's.
 */
export function readAndMatchProblems(options: readonly EditorItem[]): string[] {
  const out: string[] = [];
  const n = options.length;
  if (n < READ_AND_MATCH_MIN_OPTIONS || n > READ_AND_MATCH_MAX_OPTIONS) {
    out.push(`Give ${READ_AND_MATCH_MIN_OPTIONS} to ${READ_AND_MATCH_MAX_OPTIONS} pictures (there are ${n}).`);
  }
  const correct = options.filter((o) => o.isCorrect === true).length;
  if (correct !== 1) out.push(`Mark exactly one picture as the match (${correct} marked).`);
  const seen = new Map<string, number>();
  options.forEach((o, i) => {
    if (o.kind !== "image") out.push(`Option ${i + 1} must be a picture.`);
    else if (!isFilled(o)) out.push(`Option ${i + 1} has no picture yet.`);
    const unref = unreferencedProblem(o);
    if (unref) out.push(`Option ${i + 1}: ${unref}.`);
    const key = referenceKey(o);
    if (key && seen.has(key)) out.push(`Options ${seen.get(key)! + 1} and ${i + 1} are the same picture.`);
    else if (key) seen.set(key, i);
  });
  return out;
}

/** The config as the write schema takes it: the phrase, picture references, the flag. */
export function writeReadAndMatch(config: Config): Config {
  const out: Config = {
    sentence: writePhrase(config.sentence),
    options: readAndMatchOptions(config).map((o) => {
      const w = toContentItemWrite(o);
      if (w.isCorrect !== true) delete w.isCorrect;
      return w;
    }),
  };
  return sharedOptional(config, out, ["playSentenceFirst", "conditionalAudio"]);
}
