/**
 * Drag Dots to Letter Activity
 *
 * Students drag dots from a pool and place them in the correct positions on a letter.
 * Teaches dot placement for Arabic letters with dots (ب، ت، ث، ج، خ، etc.)
 *
 * @example
 * ```
 * {
 *   type: 'drag_dots_to_letter',
 *   config: {
 *     targetLetter: 'ب',
 *     position: 'isolated'
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
 * Configuration for Drag Dots to Letter activity
 */
export const DragDotsToLetterConfigSchema = z.object({
  targetLetter: z.string()
    .length(1)
    .refine(
      (letter) => SUPPORTED_DOTTED_LETTERS.includes(letter as any),
      {
        message: `Letter must be one of the supported dotted letters: ${SUPPORTED_DOTTED_LETTERS.join(', ')}`,
      }
    )
    .describe('Arabic letter with dots that student needs to complete'),

  position: LetterPositionSchema
    .optional()
    .default('isolated')
    .describe('Form of the letter (isolated, initial, medial, final)'),

  distractorDotsCount: z.number()
    .int()
    .min(0)
    .max(5)
    .optional()
    .default(0)
    .describe('Number of extra incorrect dots to include (0-5, default: 0)'),
});

/**
 * Complete Drag Dots to Letter activity schema
 */
export const DragDotsToLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('drag_dots_to_letter'),
  config: DragDotsToLetterConfigSchema,
});

// Type exports
export type DragDotsToLetterConfig = z.infer<typeof DragDotsToLetterConfigSchema>;
export type DragDotsToLetterActivity = z.infer<typeof DragDotsToLetterActivitySchema>;

// Export supported letters for use in forms
export { SUPPORTED_DOTTED_LETTERS };
