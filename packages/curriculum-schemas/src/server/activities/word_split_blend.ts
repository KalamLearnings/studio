/**
 * Word Split Blend Activity
 *
 * A vowelled Arabic word is split into reading-order chunks (e.g. "مَدْ" + "رَ" + "سَة")
 * which the child blends back into the full word.
 *
 * Blank chunk text / word is allowed while authoring; the rebuild check only
 * runs once the word and every chunk are filled in.
 *
 * @example
 * ```
 * {
 *   type: 'word_split_blend',
 *   config: {
 *     word: 'مَدْرَسَة',
 *     chunks: [{ text: 'مَدْ' }, { text: 'رَ' }, { text: 'سَة' }]
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import { BlendFormSchema } from '../blend.ts';
import { BlendWordReferenceSchema } from './sound_blend.ts';
import { makeReadSchema } from '../references.ts';

export const WORD_SPLIT_BLEND_MIN_CHUNKS = 2;
export const WORD_SPLIT_BLEND_MAX_CHUNKS = 6;

/**
 * Normalize Arabic text for rebuild comparison: NFKC, then strip harakat,
 * tatweel, ZWJ/ZWNJ and whitespace.
 */
export function normalizeForSplitComparison(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/[ـ‌‍\s]/g, '');
}

export const WordSplitChunkSchema = z.object({
  text: z.string()
    .describe(
      'Chunk text with harakat (plain joined substring of the word, e.g. "مَدْ"); blank allowed while authoring',
    ),

  audio_url: z.string()
    .optional()
    .describe('Optional audio for this chunk'),
});

export type WordSplitChunk = z.infer<typeof WordSplitChunkSchema>;

export const WordSplitBlendConfigSchema = z.object({
  word: z.string()
    .default('')
    .describe('Full vowelled Arabic word (e.g. "مَدْرَسَة"); blank allowed while authoring'),

  wordId: z.string()
    .optional()
    .describe('Optional curriculum_words id'),

  chunks: z.array(WordSplitChunkSchema)
    .min(WORD_SPLIT_BLEND_MIN_CHUNKS)
    .max(WORD_SPLIT_BLEND_MAX_CHUNKS)
    .describe('Chunks in reading order (2-6)'),

  wordAudioUrl: z.string()
    .optional()
    .describe('Optional audio for the full word'),

  transliteration: z.string()
    .optional()
    .describe('Optional transliteration for reference (e.g., "madrasa")'),

  meaning: z.string()
    .optional()
    .describe('Optional English meaning (e.g., "school")'),

  // Blend v2 (ADR 0078, SB-B10), all optional: a row with none of them is a
  // legacy row. The server writes them on save, together with `word`,
  // `wordId` and `chunks` derived from the word's stored split.
  blendVersion: z.literal(2)
    .optional()
    .describe('2 when the row points at a library word and its split'),

  wordRef: BlendWordReferenceSchema
    .optional()
    .describe('The library word whose split and audio this activity uses'),

  ending: BlendFormSchema
    .optional()
    .describe('Which form the activity shows and plays; pausal when absent'),
}).superRefine((config, ctx) => {
  const complete = config.word.trim() !== '' &&
    config.chunks.every((c) => c.text.trim() !== '');
  if (!complete) return;

  const joined = normalizeForSplitComparison(config.chunks.map((c) => c.text).join(''));
  if (joined !== normalizeForSplitComparison(config.word)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['chunks'],
      message: 'Chunks joined together must rebuild the word (ignoring diacritics)',
    });
  }
});

export const WordSplitBlendActivitySchema = BaseActivitySchema.extend({
  type: z.literal('word_split_blend'),
  config: WordSplitBlendConfigSchema,
});

export type WordSplitBlendConfig = z.infer<typeof WordSplitBlendConfigSchema>;
export type WordSplitBlendActivity = z.infer<typeof WordSplitBlendActivitySchema>;

// ============================================================================
// READ SCHEMA (CM-B7)
// ============================================================================

/**
 * Read (CM-B7): the stored row as it is. It needs the word: a `word` string,
 * a v2 `wordRef`, or the chunks that spell it (1 PROD row stores chunks only).
 */
export const WordSplitBlendReadSchema = makeReadSchema(
  (config) => config,
  z.object({
    word: z.string().optional(),
    wordRef: z.object({}).passthrough().optional(),
    chunks: z.array(z.object({ text: z.string().optional() }).passthrough()).optional(),
  }).passthrough().refine(
    (c) =>
      Boolean(c.word) || c.wordRef !== undefined ||
      (c.chunks ?? []).some((chunk) => Boolean(chunk.text)),
    { message: 'No word to split', path: ['word'] },
  ),
);
