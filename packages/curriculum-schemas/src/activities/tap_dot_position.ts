/**
 * Tap Dot Position Activity
 *
 * Students see a base letter with multiple dots on it.
 * They must tap the dot(s) that are in the correct position for the target letter.
 *
 * @example
 * ```
 * {
 *   type: 'tap_dot_position',
 *   config: {
 *     targetLetter: 'ج',
 *     distractorDotsCount: 2
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, LetterPositionSchema } from '../base';

/**
 * Letters that are supported for this activity (letters with dots)
 */
const SUPPORTED_DOTTED_LETTERS = [
  'ب', 'ت', 'ث',  // Ba family
  'ج', 'خ',      // Jeem family
  'ذ',           // Dal family
  'ز',           // Ra family
  'ش',           // Seen family
  'ض',           // Sad family
  'ظ',           // Tah family
  'غ',           // Ain family
  'ف', 'ق',      // Fa/Qaf
  'ن',           // Noon
  'ي',           // Ya
] as const;

/**
 * Available dot positions on a letter
 */
export const DOT_POSITIONS = [
  'top',
  'bottom',
  'middle',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

export type DotPosition = typeof DOT_POSITIONS[number];

/**
 * Configuration for Tap Dot Position activity
 */
export const TapDotPositionConfigSchema = z.object({
  targetLetter: z.string()
    .length(1)
    .refine(
      (letter) => SUPPORTED_DOTTED_LETTERS.includes(letter as any),
      {
        message: `Letter must be one of the supported dotted letters: ${SUPPORTED_DOTTED_LETTERS.join(', ')}`,
      }
    )
    .describe('Arabic letter with dots that student needs to identify'),

  position: LetterPositionSchema
    .optional()
    .default('isolated')
    .describe('Form of the letter (isolated, initial, medial, final)'),

  distractorPositions: z.array(z.enum(DOT_POSITIONS))
    .optional()
    .default([])
    .describe('Explicit positions where distractor dots should appear'),
});

/**
 * Complete Tap Dot Position activity schema
 */
export const TapDotPositionActivitySchema = BaseActivitySchema.extend({
  type: z.literal('tap_dot_position'),
  config: TapDotPositionConfigSchema,
});

// Type exports
export type TapDotPositionConfig = z.infer<typeof TapDotPositionConfigSchema>;
export type TapDotPositionActivity = z.infer<typeof TapDotPositionActivitySchema>;

// Export constants for use in forms
export { SUPPORTED_DOTTED_LETTERS };
