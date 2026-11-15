/**
 * Shared pieces of the reading-type forms (content model CM-S12; backend
 * CM-B35, ADR 0002): `read_and_match`, `sentence_builder` and `sound_sort`.
 * These types reach v2 only; the server stays the final check on every save,
 * and the problems here only mirror its rules so the author sees them early.
 * Pure: no React, no fetch.
 */

import { PHRASE_KIND } from "@kalam/curriculum-schemas/server";
import { fromPhraseItem, type PhraseDraft } from "../phrases/phraseItem";
import { isFilled, kindedItem, type EditorItem } from "../activityConfig/contentItems";

export type Config = Record<string, unknown>;

export const isRecord = (v: unknown): v is Config => typeof v === "object" && v !== null && !Array.isArray(v);

/** The smallest `<prefix><n>` (from 1) not among `taken`. */
export function nextId(prefix: string, taken: Iterable<string | undefined>): string {
  const used = new Set(taken);
  let n = 1;
  while (used.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** The stored `sentence` as a draft (tolerant). */
export function sentenceDraft(config: Config | undefined): PhraseDraft {
  return fromPhraseItem(config?.sentence);
}

/**
 * The phrase item a form keeps: the builder's valid item, else the draft in
 * the item's shape, so a half-built phrase is never lost (the server says
 * what is wrong with it on save).
 */
export function phraseValue(item: unknown, draft: PhraseDraft): Config {
  if (isRecord(item)) return item;
  return { kind: PHRASE_KIND, phrase: { wordIds: [...draft.wordIds], isSentence: draft.isSentence } };
}

/** The phrase as the write schema takes it: ids in order and the flag, nothing else. */
export function writePhrase(value: unknown): Config {
  const d = fromPhraseItem(value);
  return { kind: PHRASE_KIND, phrase: { wordIds: d.wordIds, isSentence: d.isSentence } };
}

/** A stored list of kinded items, as the editor holds them (unknown entries skipped). */
export function editorItems(value: unknown): EditorItem[] {
  return Array.isArray(value) ? value.filter(isRecord).map((e) => ({ ...kindedItem(e) })) : [];
}

/** The stored reference that names an item's content (`word:<id>`, `image:<id>`), or null. */
export function referenceKey(item: EditorItem): string | null {
  switch (item.kind) {
    case "word":
      return item.word?.wordId ? `word:${item.word.wordId}` : null;
    case "image":
      return item.image?.assetId ? `image:${item.image.assetId}` : null;
    case "audio":
      return item.audio?.assetId ? `audio:${item.audio.assetId}` : null;
    case "letter":
      return item.letter?.letterId ? `letter:${item.letter.letterId}` : null;
    default:
      return null;
  }
}

/**
 * Why a picked item cannot be saved by reference, or null: a picture or clip
 * picked by URL only (not in the asset registry), a word typed rather than
 * picked from the library.
 */
export function unreferencedProblem(item: EditorItem): string | null {
  if (!isFilled(item)) return null;
  if (item.kind === "image" && !item.image?.assetId) return "the picture is not in the asset registry; pick a registered picture";
  if (item.kind === "audio" && !item.audio?.assetId) return "the sound clip has no library id; pick it from the audio library";
  if (item.kind === "word" && !item.word?.wordId) return "the word is not from the word library; pick a library word";
  return null;
}

/** Display hints for stored references: a word's text, a picture's URL. */
export interface ReferenceHints {
  wordText: (wordId: string) => string | undefined;
  imageUrl: (assetId: string) => string | undefined;
}

/** The item with its missing display hints filled from the libraries (a stored row keeps ids only). */
export function withHints(item: EditorItem, hints: ReferenceHints): EditorItem {
  if (item.kind === "word" && item.word?.wordId && !item.word.text) {
    const text = hints.wordText(item.word.wordId);
    if (text) return { ...item, word: { ...item.word, text } };
  }
  if (item.kind === "image" && item.image?.assetId && !item.image.url) {
    const url = hints.imageUrl(item.image.assetId);
    if (url) return { ...item, image: { ...item.image, url } };
  }
  return item;
}

/** Keeps the optional keys every reading type shares, as JSON would send them. */
export function sharedOptional(config: Config, out: Config, keys: readonly string[]): Config {
  for (const k of keys) if (config[k] !== undefined) out[k] = config[k];
  return out;
}
