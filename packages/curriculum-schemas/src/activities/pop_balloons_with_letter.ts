/**
 * Pop Balloons with Letter Activity
 *
 * Fun game where student pops balloons containing the target letter as they float up.
 * Includes distractor letters and time pressure for engaging gameplay.
 *
 * @example
 * ```
 * {
 *   type: 'pop_balloons_with_letter',
 *   config: {
 *     correctLetter: 'ب',
 *     correctLetterForms: ['ب', 'بـ', 'ـبـ', 'ـب'],
 *     distractorLetters: ['ت', 'ث', 'ن'],
 *     duration: 60,
 *     targetCount: 10,
 *     balloonSpeed: 1.0,
 *     spawnRate: 1.5,
 *     correctRatio: 0.4
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import {
  BaseActivitySchema,
  ArabicLetterSchema,
  DurationSecondsSchema,
  MultiplierSchema,
  RatioSchema,
} from '../base';

/**
 * Configuration for Pop Balloons with Letter activity
 */
export const PopBalloonsWithLetterConfigSchema = z.object({
  correctLetter: ArabicLetterSchema
    .describe('Target letter to find on balloons'),

  correctLetterForms: z.array(ArabicLetterSchema)
    .optional()
    .describe('Alternative forms of the target letter (initial, medial, final)'),

  distractorLetters: z.array(ArabicLetterSchema)
    .min(3, 'At least 3 distractor letters required')
    .describe('Wrong letters to show on balloons'),

  duration: DurationSecondsSchema
    .default(60)
    .describe('Game duration in seconds'),

  targetCount: z.number()
    .int()
    .positive()
    .default(10)
    .describe('How many correct balloons student must pop to complete'),

  balloonSpeed: MultiplierSchema
    .default(1.0)
    .describe('How fast balloons rise (1.0 = normal, 2.0 = double speed)'),

  spawnRate: z.number()
    .positive()
    .default(1.5)
    .describe('How many balloons spawn per second'),

  correctRatio: RatioSchema
    .default(0.4)
    .describe('Percentage of balloons with correct letter (0.4 = 40% correct, 60% distractors)'),
});

/**
 * Complete Pop Balloons with Letter activity schema
 */
export const PopBalloonsWithLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('pop_balloons_with_letter'),
  config: PopBalloonsWithLetterConfigSchema,
});

// Type exports
export type PopBalloonsWithLetterConfig = z.infer<typeof PopBalloonsWithLetterConfigSchema>;
export type PopBalloonsWithLetterActivity = z.infer<typeof PopBalloonsWithLetterActivitySchema>;
