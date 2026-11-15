/**
 * `sentence_builder` in Studio (CM-S12; backend CM-B35, ADR 0002): the child
 * puts the word tiles of a reviewed phrase or sentence in order. The tiles are
 * the sentence's own words plus up to three extra library words; an optional
 * picture is the cue. Pure.
 */

import { isFilled, toContentRefWrite, type EditorItem } from "../activityConfig/contentItems";
import { phraseWordIssue, type PhraseWord } from "../phrases/phraseItem";
import { editorItems, isRecord, sharedOptional, unreferencedProblem, writePhrase, type Config } from "./common";

/** The schema's bound (`sentence_builder.ts`; the package does not export it). */
export const SENTENCE_BUILDER_MAX_DISTRACTORS = 3;

export function distractorWordsOf(config: Config | undefined): EditorItem[] {
  return editorItems(config?.distractorWords);
}

export function promptImageOf(config: Config | undefined): EditorItem | null {
  return isRecord(config?.promptImage) ? editorItems([config!.promptImage])[0] ?? null : null;
}

/** The library words an author may add as extra tiles: usable in a phrase, not in the sentence, not already added. */
export function distractorChoices<W extends PhraseWord>(
  words: readonly W[],
  sentenceWordIds: readonly string[],
  distractors: readonly EditorItem[],
): W[] {
  const taken = new Set([...sentenceWordIds, ...distractors.map((d) => d.word?.wordId).filter(Boolean) as string[]]);
  return words.filter((w) => phraseWordIssue(w) === null && !taken.has(w.id));
}

/** What stops the extra tiles and the cue picture from saving (write schema, `distractors_differ`, `phrase_words` spirit). */
export function sentenceBuilderProblems(
  sentenceWordIds: readonly string[],
  distractors: readonly EditorItem[],
  promptImage: EditorItem | null,
  wordById: (id: string) => PhraseWord | null | undefined,
): string[] {
  const out: string[] = [];
  if (distractors.length > SENTENCE_BUILDER_MAX_DISTRACTORS) {
    out.push(`At most ${SENTENCE_BUILDER_MAX_DISTRACTORS} extra word tiles (there are ${distractors.length}).`);
  }
  const inSentence = new Set(sentenceWordIds);
  const seen = new Set<string>();
  distractors.forEach((d, i) => {
    const id = d.word?.wordId;
    const name = `Extra word ${i + 1}${d.word?.text ? ` (${d.word.text})` : ""}`;
    if (d.kind !== "word" || !id) {
      out.push(`${name} is not a library word.`);
      return;
    }
    if (inSentence.has(id)) out.push(`${name} is a word of the sentence; it would fit a slot.`);
    if (seen.has(id)) out.push(`${name} is added twice.`);
    seen.add(id);
    const issue = phraseWordIssue(wordById(id));
    if (issue === "unreviewed") out.push(`${name} is not reviewed yet.`);
    else if (issue === "retired") out.push(`${name} is retired.`);
    else if (issue === "pseudo") out.push(`${name} is a drill word, not a real word.`);
  });
  if (promptImage && isFilled(promptImage)) {
    const unref = unreferencedProblem(promptImage);
    if (unref) out.push(`Prompt picture: ${unref}.`);
  }
  return out;
}

/** The config as the write schema takes it. Empty extra tiles and an unset cue are left out. */
export function writeSentenceBuilder(config: Config): Config {
  const out: Config = { sentence: writePhrase(config.sentence) };
  const distractors = distractorWordsOf(config);
  if (distractors.length > 0) out.distractorWords = distractors.map(toContentRefWrite);
  const prompt = promptImageOf(config);
  if (prompt && isFilled(prompt)) out.promptImage = toContentRefWrite(prompt);
  return sharedOptional(config, out, ["playSentenceFirst", "conditionalAudio"]);
}
