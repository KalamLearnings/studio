/**
 * Catch Fish with Letter Activity
 *
 * Fun fishing game where student catches fish containing the target letter.
 * Fish swim across screen and student taps to catch them.
 *
 * @example
 * ```
 * {
 *   type: 'catch_fish_with_letter',
 *   config: {
 *     targetLetter: 'ب',
 *     targetLetterForms: ['ب', 'بـ', 'ـبـ', 'ـب'],
 *     distractorLetters: ['ت', 'ث', 'ن'],
 *     duration: 60,
 *     targetCount: 10
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import {
  BaseActivitySchema,
  ArabicLetterSchema,
  DurationSecondsSchema,
} from '../base';

/**
 * Configuration for Catch Fish with Letter activity
 */
export const CatchFishWithLetterConfigSchema = z.object({
  targetLetter: ArabicLetterSchema
    .describe('Target letter to find on fish'),

  targetLetterForms: z.array(ArabicLetterSchema)
    .optional()
    .describe('Alternative forms of target letter (initial, medial, final)'),

  distractorLetters: z.array(ArabicLetterSchema)
    .min(3, 'At least 3 distractor letters required')
    .describe('Wrong letters to show on fish'),

  duration: DurationSecondsSchema
    .optional()
    .describe('Game duration in seconds'),

  targetCount: z.number()
    .int()
    .positive()
    .optional()
    .describe('How many correct fish student must catch to complete'),
});

/**
 * Complete Catch Fish with Letter activity schema
 */
export const CatchFishWithLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('catch_fish_with_letter'),
  config: CatchFishWithLetterConfigSchema,
});

// Type exports
export type CatchFishWithLetterConfig = z.infer<typeof CatchFishWithLetterConfigSchema>;
export type CatchFishWithLetterActivity = z.infer<typeof CatchFishWithLetterActivitySchema>;
