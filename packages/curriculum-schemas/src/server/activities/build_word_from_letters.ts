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
import { ArabicTextSchema, BaseActivitySchema, LocalizedTextSchema } from '../base.ts';
import { isEmptyLocalizedText, makeReadSchema, withoutKeys } from '../references.ts';

/**
 * Configuration for Build Word from Letters activity
 */
export const BuildWordFromLettersConfigSchema = z.object({
  targetWord: ArabicTextSchema
    .describe('The Arabic word to build (can be a name, word, or phrase)'),

  letterDisplayMode: z.enum(['contextual', 'isolated'])
    .default('contextual')
    .describe(
      'How to display scattered letters: "contextual" shows letters in their word form (initial/medial/final), "isolated" shows letters in isolated form for letter recognition practice',
    ),

  showConnectedForm: z.boolean()
    .default(true)
    .describe('Show how letters connect in context after correct placement'),

  highlightCorrectPositions: z.boolean()
    .default(true)
    .describe('Highlight correct drop zones to guide student'),

  scrambleLetters: z.boolean()
    .default(true)
    .describe(
      'Randomize initial letter positions (false = letters in order but displaced)',
    ),

  showWordMeaning: z.boolean()
    .default(false)
    .describe('Show translation/meaning of the word after completion'),

  wordMeaning: LocalizedTextSchema
    .optional()
    .describe(
      'Translation/meaning to show (required if showWordMeaning is true)',
    ),
}).refine(
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
  },
);

/**
 * Complete Build Word from Letters activity schema
 */
export const BuildWordFromLettersActivitySchema = BaseActivitySchema.extend({
  type: z.literal('build_word_from_letters'),
  config: BuildWordFromLettersConfigSchema,
});

// Type exports
export type BuildWordFromLettersConfig = z.infer<
  typeof BuildWordFromLettersConfigSchema
>;
export type BuildWordFromLettersActivity = z.infer<
  typeof BuildWordFromLettersActivitySchema
>;

// ============================================================================
// READ SCHEMA (CM-B7)
// ============================================================================

/**
 * Read (CM-B7): an all-empty `wordMeaning` (`{ en: '', ar: '' }`, 47 PROD
 * rows) is dropped. A row needs a word (`targetWord`, or a `wordRef`) or
 * `useChildName` (build the child's own name).
 */
export const BuildWordFromLettersReadSchema = makeReadSchema(
  (
    config,
  ) => (isEmptyLocalizedText(config.wordMeaning) ? withoutKeys(config, ['wordMeaning']) : config),
  z.object({ targetWord: z.string().optional(), useChildName: z.boolean().optional() })
    .passthrough().refine(
      (c) => Boolean(c.targetWord) || c.wordRef !== undefined || c.useChildName === true,
      { message: 'No word to build', path: ['targetWord'] },
    ),
);
