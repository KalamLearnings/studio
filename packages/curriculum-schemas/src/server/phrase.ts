/**
 * The `phrase` content item (content model CM-B33; `docs/adr/0002-reading-strands.md`,
 * decision 2): a phrase or a whole sentence as reviewed word rows in order.
 *
 * ```
 * { kind: 'phrase', phrase: { wordIds: string[], isSentence: boolean } }
 * ```
 *
 * - No Arabic text is stored. The server builds the reading text from the word
 *   rows (`phraseText` in `domain/curriculum/phrase.ts`), as it does for one word
 *   (ADR 0001, "configs hold only ids"). A save cannot send `text`.
 * - There is no sentence entity. A phrase is named by its ordered word ids
 *   (`phraseKey`): the phrase review log (`phrase_reviews`) keys its approvals by
 *   them, so a phrase is reviewed once wherever it is used.
 * - `isSentence` says whether the words form a full sentence (`read:sentence`) or
 *   a phrase that is not one (`read:phrase`).
 *
 * The kind sits beside the CM-B12 kinds (`references.ts`) but is not in
 * `CONTENT_KINDS`, so no existing type (and no v1 read) takes a phrase. The
 * types that use it name it in their own write schema (CM-B35:
 * `read_and_match` and `sentence_builder` hold `PhraseRefWriteSchema` at
 * `sentence`); both are v2 only.
 */

import { z } from 'zod';
import { isRecord } from './references.ts';

export const PHRASE_KIND = 'phrase' as const;

/** ADR 0002, decision 1: a phrase is 2 to 4 words, a sentence 2 to 8. */
export const PHRASE_MIN_WORDS = 2;
export const PHRASE_MAX_WORDS = 4;
export const SENTENCE_MAX_WORDS = 8;

/**
 * A word row id as the content index can name it (`word:<id>`, the `word`
 * namespace of `skill_graph.ts`). No spaces, so `phraseKey` is unambiguous.
 */
export const PHRASE_WORD_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** The most words a phrase of this kind may hold. */
export function maxWordsOf(isSentence: boolean): number {
  return isSentence ? SENTENCE_MAX_WORDS : PHRASE_MAX_WORDS;
}

/**
 * The phrase's identity: its ordered word ids joined by one space. Any change of
 * a word or of the order is a new phrase (ADR 0002, decision 2), so it needs a
 * new review. The `phrase_reviews.phrase_key` column holds this string.
 */
export function phraseKey(wordIds: readonly string[]): string {
  return wordIds.join(' ');
}

const LENGTH_MESSAGE = (isSentence: boolean) =>
  `a ${isSentence ? 'sentence' : 'phrase'} holds ${PHRASE_MIN_WORDS} to ${
    maxWordsOf(isSentence)
  } words`;

/** The phrase payload as a save must send it: ids only, in reading order, and the flag. */
export const PhraseWriteSchema = z
  .object({
    wordIds: z
      .array(z.string().regex(PHRASE_WORD_ID, 'a word id (curriculum_words.id)'))
      .min(PHRASE_MIN_WORDS, `a phrase holds at least ${PHRASE_MIN_WORDS} words`)
      .max(SENTENCE_MAX_WORDS, `a sentence holds at most ${SENTENCE_MAX_WORDS} words`),
    isSentence: z.boolean(),
  })
  .strict()
  .superRefine((phrase, ctx) => {
    if (phrase.wordIds.length > maxWordsOf(phrase.isSentence)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wordIds'],
        message: LENGTH_MESSAGE(phrase.isSentence),
      });
    }
  });

export type PhraseWrite = z.infer<typeof PhraseWriteSchema>;

/**
 * A phrase that is not an answer choice (a prompt, a stimulus): named by its
 * path (ADR 0090), like `ContentRefWriteSchema`.
 */
export const PhraseRefWriteSchema = z
  .object({ kind: z.literal(PHRASE_KIND), phrase: PhraseWriteSchema })
  .strict();

export type PhraseRefWrite = z.infer<typeof PhraseRefWriteSchema>;

/** A phrase as an answer choice: the authored option `id` and `isCorrect`, like `ContentItemWriteSchema`. */
export const PhraseChoiceWriteSchema = z
  .object({
    id: z.string().min(1),
    kind: z.literal(PHRASE_KIND),
    phrase: PhraseWriteSchema,
    isCorrect: z.boolean().optional(),
  })
  .strict();

export type PhraseChoiceWrite = z.infer<typeof PhraseChoiceWriteSchema>;

// ============================================================================
// READ (tolerant)
// ============================================================================

/** True for a stored record that says it is a phrase item. */
export function isPhraseItem(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.kind === PHRASE_KIND;
}

/**
 * A stored phrase item in the canonical shape: each word id read from a string
 * or a `{ wordId }` reference (the word-item shape), a missing `isSentence` read
 * as `false`, and any text hint dropped (the server derives the text). Other
 * keys are kept, so the stored schema reports what it cannot read.
 */
export function readPhraseItem(item: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(item.phrase)) return item;
  const { text: _text, ...phrase } = item.phrase;
  const ids = Array.isArray(phrase.wordIds)
    ? phrase.wordIds.map((w) => isRecord(w) && typeof w.wordId === 'string' ? w.wordId : w)
    : phrase.wordIds;
  return {
    ...item,
    phrase: { ...phrase, wordIds: ids, isSentence: phrase.isSentence === true },
  };
}

/** A stored value read as a phrase item when it says it is one; anything else unchanged. */
export function readPhraseValue(value: unknown): unknown {
  return isPhraseItem(value) ? readPhraseItem(value) : value;
}

/** A tolerant stored phrase item: the canonical fields, any extra keys, no length rule. */
export const PhraseItemStoredSchema = z
  .object({
    kind: z.literal(PHRASE_KIND),
    phrase: z
      .object({
        wordIds: z.array(z.string().min(1)).min(1, 'a phrase names its words'),
        isSentence: z.boolean(),
      })
      .passthrough(),
  })
  .passthrough();

/** One stored phrase item, read: the normaliser, then the tolerant schema. */
export const PhraseItemReadSchema = z
  .record(z.unknown())
  .transform(readPhraseItem)
  .pipe(PhraseItemStoredSchema);
