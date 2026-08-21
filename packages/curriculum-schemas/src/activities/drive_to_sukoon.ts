/**
 * Drive to Sukoon Activity
 *
 * Teaches the sukoon (ـْ) — the mark meaning "no vowel": the sound STOPS on
 * that letter. A word is shown in connected Arabic script and the child drags
 * a car leftward along a road beneath it (Arabic is RTL, so the car starts at
 * the RIGHT), releasing it on the letter carrying the sukoon. A stop sign
 * appears above that letter on a correct release.
 *
 * The target letter is NOT stored. It is derived at render time from the
 * word's own diacritics, so the mark on screen and the correct answer cannot
 * disagree. The schema instead validates that the word carries exactly one
 * sukoon, which is what makes the round playable.
 *
 * @example
 * ```
 * {
 *   type: 'drive_to_sukoon',
 *   config: {
 *     word: { wordId: 'w_123', text: 'مَرْيَم' },
 *     showStopSign: true
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base';

/** The sukoon combining mark (U+0652). */
const SUKOON = 'ْ';

/** How many sukoon marks a word carries. */
export function countSukoon(text: string): number {
  let count = 0;
  for (const ch of text.normalize('NFKC')) {
    if (ch === SUKOON) count++;
  }
  return count;
}

/**
 * A word reference into curriculum_words. `wordId` is authoritative — the
 * library row is the source of truth for text, translation, audio and letter
 * composition. `text` is a cached display hint only.
 */
export const SukoonWordReferenceSchema = z.object({
  wordId: z.string()
    .min(1)
    .optional()
    .describe('curriculum_words id — authoritative reference'),

  text: z.string()
    .min(1)
    .describe('The Arabic word, fully vowelled, carrying exactly one sukoon'),
});

/**
 * Configuration for Drive to Sukoon activity
 */
export const DriveToSukoonConfigSchema = z.object({
  word: SukoonWordReferenceSchema
    .describe('The word to drive along (curriculum_words reference)'),

  showStopSign: z.boolean()
    .default(true)
    .describe('Show the stop sign above the sukoon letter on a correct release'),
}).refine(
  (config) => countSukoon(config.word.text) === 1,
  {
    message:
      'The word must carry exactly one sukoon (ـْ) — the target letter is derived from it, so zero or multiple sukoons make the round unplayable.',
    path: ['word', 'text'],
  }
);

/**
 * Complete Drive to Sukoon activity schema
 */
export const DriveToSukoonActivitySchema = BaseActivitySchema.extend({
  type: z.literal('drive_to_sukoon'),
  config: DriveToSukoonConfigSchema,
});

// Type exports
export type SukoonWordReference = z.infer<typeof SukoonWordReferenceSchema>;
export type DriveToSukoonConfig = z.infer<typeof DriveToSukoonConfigSchema>;
export type DriveToSukoonActivity = z.infer<typeof DriveToSukoonActivitySchema>;
