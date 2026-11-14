/**
 * word_split_blend on the blend word model (SB-B10, ADR 0078): its config
 * shape and its mapper onto the shared word editor (`lib/blendWord`).
 *
 * - A legacy row (no `blendVersion`) keeps the hand-made chunk editor and is
 *   stored as sent.
 * - A v2 row (`blendVersion: 2`) sends `wordRef` and `ending`. The SERVER
 *   resolves the word, splits it and writes `blendVersion`, `wordRef`,
 *   `wordId`, `word` and `chunks`. It keeps `ending`, `wordAudioUrl`,
 *   `transliteration` and `meaning`. The sent `chunks` are read only for the
 *   audio of a chunk whose text the server builds unchanged, so Studio keeps
 *   them as read and never edits them.
 * - sound_blend's own settings (`stages`, `speed`, `requiredSlides`,
 *   `showBothSpeeds`, `segments`, `contentType`) are refused on a
 *   word_split_blend row (`blendTypeIssues`); the mapper drops them.
 * - Converting a legacy row ("Use the word model") stamps the v2 fields from
 *   what the row shows, as sound_blend's first word edit does (SB-S1).
 */

import { stampWordModelFields, type BlendWordConfig, type WordModelParts } from "../blendWord/config";
import { createWordEditor } from "../blendWord/editor";

export interface WordSplitChunk {
  text: string;
  audio_url?: string;
}

export interface WordSplitBlendFormConfig extends BlendWordConfig {
  /** Legacy, and server-written on v2 rows. */
  wordId?: string;
  /** Legacy: hand-made. v2: server-written, read-only in Studio. */
  chunks?: WordSplitChunk[];
  wordAudioUrl?: string;
  transliteration?: string;
  meaning?: string;
}

/** sound_blend-only fields the server refuses on a word_split_blend v2 row. */
export const SOUND_BLEND_ONLY_FIELDS = [
  "stages",
  "speed",
  "requiredSlides",
  "showBothSpeeds",
  "segments",
  "contentType",
] as const;

/**
 * word_split_blend's mapper: the word-model fields, without sound_blend's
 * settings. The server-owned `word` and `wordId` are dropped (the server
 * writes them from the word); `chunks` stay as read, for their audio.
 */
export function stampWordSplitBlendFields(
  config: WordSplitBlendFormConfig,
  parts: WordModelParts,
): WordSplitBlendFormConfig {
  const next = stampWordModelFields(config, parts) as WordSplitBlendFormConfig & Record<string, unknown>;
  for (const key of SOUND_BLEND_ONLY_FIELDS) delete next[key];
  delete next.word;
  delete next.wordId;
  return next;
}

export const wordSplitBlendWordEditor = createWordEditor<WordSplitBlendFormConfig>(stampWordSplitBlendFields);

/**
 * A word typed or picked from the library. A library word also fills the
 * transliteration and the meaning, as the legacy form does.
 */
export function pickWord(
  config: WordSplitBlendFormConfig,
  text: string,
  libraryWord?: { id: string; is_pseudo?: boolean | null; transliteration?: string | null; english?: string | null },
): WordSplitBlendFormConfig {
  const next = wordSplitBlendWordEditor.changeWord(config, text, libraryWord);
  if (libraryWord?.transliteration) next.transliteration = libraryWord.transliteration;
  if (libraryWord?.english) next.meaning = libraryWord.english;
  return next;
}

/** The chunks have text the author made by hand, which converting replaces. */
export function hasHandMadeChunks(config: WordSplitBlendFormConfig): boolean {
  return (config.chunks ?? []).some((c) => c.text.trim() !== "");
}

/**
 * "Use the word model": a legacy row becomes `blendVersion: 2`. The word
 * reference is the row's library word (`wordId`) and its text; the ending is
 * the one the row shows. The chunks stay as read: the server rebuilds them on
 * save and keeps a chunk's audio only where its text is unchanged.
 */
export function convertToWordModel(config: WordSplitBlendFormConfig): WordSplitBlendFormConfig {
  const text = (config.word ?? "").trim();
  return wordSplitBlendWordEditor.commit(config, {
    text,
    wordId: config.wordId ? config.wordId : null,
  });
}
