/**
 * Build Word from Letters Activity
 *
 * Student drags scattered letters to build a target Arabic word.
 * Handles proper letter connections and forms (isolated/initial/medial/final).
 *
 * Use cases:
 * - Build child's name (e.g., "محمد")
 * - Build vocabulary words (e.g., "باب")
 * - Build short phrases (e.g., "أهلا")
 *
 * Note: This replaces both the old "name_builder" and "word_builder" activity types.
 *
 * @example
 * ```
 * {
 *   type: 'build_word_from_letters',
 *   config: {
 *     targetWord: 'باب',
 *     showConnectedForm: true,
 *     highlightCorrectPositions: true,
 *     scrambleLetters: true,
 *     showWordMeaning: true,
 *     wordMeaning: {
 *       en: 'Door',
 *       ar: 'باب'
 *     }
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, ArabicTextSchema, LocalizedTextSchema } from '../base';

/**
 * Configuration for Build Word from Letters activity
 */
export const BuildWordFromLettersConfigSchema = z.object({
  targetWord: ArabicTextSchema
    .optional()
    .describe('The Arabic word to build (can be a name, word, or phrase). Not required if useChildName is true.'),

  useChildName: z.boolean()
    .default(false)
    .describe('Use the child\'s name as the target word instead of a custom word'),

  showConnectedForm: z.boolean()
    .default(true)
    .describe('Show how letters connect in context after correct placement'),

  highlightCorrectPositions: z.boolean()
    .default(true)
    .describe('Highlight correct drop zones to guide student'),

  scrambleLetters: z.boolean()
    .default(true)
    .describe('Randomize initial letter positions (false = letters in order but displaced)'),

  showWordMeaning: z.boolean()
    .default(false)
    .describe('Show translation/meaning of the word after completion'),

  wordMeaning: LocalizedTextSchema
    .optional()
    .describe('Translation/meaning to show (required if showWordMeaning is true)'),
}).refine(
  (data) => {
    // Either targetWord or useChildName must be provided
    if (!data.useChildName && !data.targetWord) {
      return false;
    }
    return true;
  },
  {
    message: 'Either targetWord or useChildName must be provided',
    path: ['targetWord'],
  }
).refine(
  (data) => {
    // If showWordMeaning is true, wordMeaning must be provided
    if (data.showWordMeaning) {
      return data.wordMeaning !== undefined;
    }
    return true;
  },
  {
    message: 'wordMeaning is required when showWordMeaning is true',
    path: ['wordMeaning'],
  }
);

/**
 * Complete Build Word from Letters activity schema
 */
export const BuildWordFromLettersActivitySchema = BaseActivitySchema.extend({
  type: z.literal('build_word_from_letters'),
  config: BuildWordFromLettersConfigSchema,
});

// Type exports
export type BuildWordFromLettersConfig = z.infer<typeof BuildWordFromLettersConfigSchema>;
export type BuildWordFromLettersActivity = z.infer<typeof BuildWordFromLettersActivitySchema>;
