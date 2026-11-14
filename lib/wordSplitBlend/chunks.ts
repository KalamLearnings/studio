/**
 * What the word_split_blend v2 form says about the chunks (SB-B10).
 *
 * The server builds the chunks from the word's stored units when it saves
 * (`legacy-chunks.ts` on the backend). Studio does NOT rebuild them: it shows
 * the splitter's units of the activity's ending and says in plain words where
 * the chunks will differ from them. Only the unit count and the unit tags are
 * read here; no chunk text is computed.
 */

import { WORD_SPLIT_BLEND_MAX_CHUNKS, WORD_SPLIT_BLEND_MIN_CHUNKS } from "@kalam/curriculum-schemas/activities";
import type { BlendEnding } from "../blendWord/config";
import type { BlendSaveErrors } from "../blendWord/saveErrors";
import type { BlendFormPreview } from "../blendWord/preview";

export const CHUNKS_NOTE = "Chunks come from the word's syllables. The server builds them when you save.";

export const CHUNK_AUDIO_NOTE =
  "Chunk audio is kept only for a chunk whose text stays the same after the server rebuilds the chunks.";

/** The warning shown before "Use the word model" converts a legacy row. */
export function convertWarning(hasHandMadeChunks: boolean): string {
  return hasHandMadeChunks
    ? "The server will rebuild the chunks from the word's syllables when you save. Your hand-made chunks will be replaced. Chunk audio is kept only where a chunk's text stays the same."
    : "The server will build the chunks from the word's syllables when you save.";
}

export const SHADDA_CHUNK_NOTE =
  "A shadda letter is split across two syllables here. A chunk does not split it: the whole letter, with its shadda, goes in the chunk of the syllable that says its vowel.";

/** The server's refusal of a word that is one unit in the played form, in plain words. */
export function singleSyllableMessage(ending: BlendEnding): string {
  return ending === "pausal"
    ? "This word is one syllable in the pausal form. Choose the full ending."
    : "This word is one syllable even in the full form. Choose a word with two or more syllables.";
}

export function chunkCapNote(units: number): string {
  return `This word has ${units} syllables. The app shows at most ${WORD_SPLIT_BLEND_MAX_CHUNKS} chunks, so syllables ${WORD_SPLIT_BLEND_MAX_CHUNKS} to ${units} are joined into the last chunk.`;
}

export interface ChunkPreviewNotes {
  /** The word is too short for this activity in the chosen form; the server will refuse it. */
  tooShort: string | null;
  /** Where the chunks differ visibly from the syllables shown. */
  notes: string[];
}

/** The plain-words notes for the syllables of the activity's form. */
export function chunkPreviewNotes(form: BlendFormPreview | null | undefined, ending: BlendEnding): ChunkPreviewNotes {
  const units = form?.units ?? [];
  if (units.length === 0) return { tooShort: null, notes: [] };
  const notes: string[] = [];
  if (units.some((u) => u.tags.some((t) => t.tag === "shaddaFirst"))) notes.push(SHADDA_CHUNK_NOTE);
  if (units.length > WORD_SPLIT_BLEND_MAX_CHUNKS) notes.push(chunkCapNote(units.length));
  return {
    tooShort: units.length < WORD_SPLIT_BLEND_MIN_CHUNKS ? singleSyllableMessage(ending) : null,
    notes,
  };
}

/** The field the server names when the word is one unit in the played form. */
export const ENDING_FIELD = "config.ending";

/**
 * A refused save, placed for the word_split_blend form: the error about the
 * ending goes under the ending choice in plain words; the rest stay general.
 */
export function wordSplitBlendSaveErrorView(
  errors: BlendSaveErrors | null,
  ending: BlendEnding,
): { ending: string | null; general: string[] } {
  if (!errors) return { ending: null, general: [] };
  const endingError = errors.entries.some((e) => e.field === ENDING_FIELD);
  return {
    ending: endingError ? singleSyllableMessage(ending) : null,
    general: errors.entries
      .filter((e) => e.field !== ENDING_FIELD)
      .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)),
  };
}
