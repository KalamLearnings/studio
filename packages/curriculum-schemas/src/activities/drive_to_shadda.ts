/**
 * Shadda Racetrack Activity
 *
 * The shadda (ـّ) doubles a consonant: the sound is held, then continues.
 * A word is shown in connected Arabic script and the child drags a car
 * leftward along a road beneath it. At the letter carrying the shadda the
 * car is held, a red light shows, then the light turns green and the drag
 * continues. The target letter is derived from the word, not stored.
 *
 * @example
 * ```
 * {
 *   type: 'drive_to_shadda',
 *   config: {
 *     word: { wordId: 'w_123', text: 'مُحَمَّد' }
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base';

/** The shadda combining mark (U+0651). */
const SHADDA = 'ّ';

/** How many shadda marks a word carries. */
export function countShadda(text: string): number {
  let count = 0;
  for (const ch of text.normalize('NFKC')) {
    if (ch === SHADDA) count++;
  }
  return count;
}

export const ShaddaWordReferenceSchema = z.object({
  wordId: z.string()
    .min(1)
    .optional()
    .describe('curriculum_words id — authoritative reference'),

  text: z.string()
    .min(1)
    .describe('The Arabic word, fully vowelled, carrying exactly one shadda'),
});

export const DriveToShaddaConfigSchema = z.object({
  word: ShaddaWordReferenceSchema
    .describe('The word to drive along (curriculum_words reference)'),

  holdMs: z.number()
    .int()
    .min(400)
    .max(3000)
    .default(1000)
    .describe('How long the red light holds the car, in milliseconds'),
}).refine(
  (config) => countShadda(config.word.text) === 1,
  {
    message:
      'The word must carry exactly one shadda (ـّ) — the hold is derived from it, so zero or multiple shaddas make the round unplayable.',
    path: ['word', 'text'],
  },
);

export const DriveToShaddaActivitySchema = BaseActivitySchema.extend({
  type: z.literal('drive_to_shadda'),
  config: DriveToShaddaConfigSchema,
});

export type ShaddaWordReference = z.infer<typeof ShaddaWordReferenceSchema>;
export type DriveToShaddaConfig = z.infer<typeof DriveToShaddaConfigSchema>;
export type DriveToShaddaActivity = z.infer<typeof DriveToShaddaActivitySchema>;
