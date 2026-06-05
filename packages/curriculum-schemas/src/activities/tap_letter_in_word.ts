/**
 * Tap Letter in Word Activity
 *
 * Student taps on specific occurrences of a target letter within a displayed Arabic word.
 * Provides immediate visual feedback and tracks correct/incorrect taps.
 *
 * @example
 * ```
 * {
 *   type: 'tap_letter_in_word',
 *   config: {
 *     targetWord: 'باب',
 *     targetLetter: 'ب',
 *     targetCount: 2,
 *     showHighlight: true,
 *     highlightColor: '#4CAF50',
 *     provideFeedback: true
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, ArabicLetterSchema, ArabicTextSchema, ColorSchema } from '../base';

/**
 * Configuration for Tap Letter in Word activity
 */
export const TapLetterInWordConfigSchema = z.object({
  targetWord: ArabicTextSchema
    .describe('The Arabic word to display'),

  targetLetter: ArabicLetterSchema
    .describe('The specific letter student should tap'),

  targetCount: z.number()
    .int()
    .positive()
    .describe('How many times the letter appears in the word'),

  showHighlight: z.boolean()
    .default(true)
    .describe('Highlight letter when tapped correctly'),

  highlightColor: ColorSchema
    .default('#4CAF50')
    .describe('Color for correct tap highlight'),

  provideFeedback: z.boolean()
    .default(true)
    .describe('Show visual feedback for incorrect taps'),

  wordMeaning: z.string()
    .optional()
    .describe('Optional translation/meaning of the word (shown after completion)'),
}).refine(
  (data) => {
    // Verify that targetLetter actually appears in targetWord
    const count = (data.targetWord.match(new RegExp(data.targetLetter, 'g')) || []).length;
    return count === data.targetCount;
  },
  (data) => ({
    message: `Target letter "${data.targetLetter}" appears ${(data.targetWord.match(new RegExp(data.targetLetter, 'g')) || []).length} times in "${data.targetWord}", but targetCount is ${data.targetCount}`,
    path: ['targetCount'],
  })
);

/**
 * Complete Tap Letter in Word activity schema
 */
export const TapLetterInWordActivitySchema = BaseActivitySchema.extend({
  type: z.literal('tap_letter_in_word'),
  config: TapLetterInWordConfigSchema,
});

// Type exports
export type TapLetterInWordConfig = z.infer<typeof TapLetterInWordConfigSchema>;
export type TapLetterInWordActivity = z.infer<typeof TapLetterInWordActivitySchema>;
