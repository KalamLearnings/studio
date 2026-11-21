/**
 * Stretch the Madd Activity
 *
 * The madd (مَدّ) lengthens a vowel: the sound is held for a count, then the
 * word continues. A word is shown in connected Arabic script and the child
 * drags along it. At the madd letter the child holds, and the stretch fills
 * one beat per count. The madd letter, its kind and its default count are
 * derived from the word's text (`detectMadds`), not stored. The author picks
 * a word; `counts` is only an override of the kind's default.
 *
 * The scene (giraffe, jeep or another) is not part of the config: the
 * contract is the same for every concept.
 *
 * @example
 * ```
 * {
 *   type: 'stretch_madd',
 *   config: {
 *     word: { wordId: 'w_123', text: 'قَالَ' }
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base';
import { countMadd } from '../madd-detect';

export const StretchMaddWordReferenceSchema = z.object({
  wordId: z.string()
    .min(1)
    .optional()
    .describe('curriculum_words id — authoritative reference'),

  text: z.string()
    .min(1)
    .describe('The Arabic word, fully vowelled, carrying exactly one natural madd'),
});

export const StretchMaddConfigSchema = z.object({
  word: StretchMaddWordReferenceSchema
    .describe('The word to stretch (curriculum_words reference)'),

  counts: z.number()
    .int()
    .min(2)
    .max(6)
    .optional()
    .describe(
      'Beats to hold the madd. Absent: derived from the madd kind (natural 2, muttasil 4, lazim 6)',
    ),

  requiredSlides: z.number()
    .int()
    .min(1)
    .max(3)
    .default(1)
    .describe('Slides through the word that finish the activity'),

  beatMs: z.number()
    .int()
    .min(300)
    .max(1500)
    .default(600)
    .describe('Length of one count, in milliseconds'),
}).refine(
  (config) => countMadd(config.word.text) === 1,
  {
    message:
      'The word must carry exactly one madd (a short vowel and its long carrier: fatha+alif, damma+waw, kasra+yaa) — the stretch is derived from it, so zero or several madds make the round unplayable.',
    path: ['word', 'text'],
  },
);

export const StretchMaddActivitySchema = BaseActivitySchema.extend({
  type: z.literal('stretch_madd'),
  config: StretchMaddConfigSchema,
});

export type StretchMaddWordReference = z.infer<typeof StretchMaddWordReferenceSchema>;
export type StretchMaddConfig = z.infer<typeof StretchMaddConfigSchema>;
export type StretchMaddActivity = z.infer<typeof StretchMaddActivitySchema>;
