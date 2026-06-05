/**
 * I Spy Activity Schema
 *
 * Children find and tap target Arabic letters scattered among distractor letters.
 * Similar to dot tapping but with letters instead of colored dots.
 */

import { z } from 'zod';
import {
  BaseActivitySchema,
  ArabicLetterSchema,
  LetterPositionSchema,
} from '../base';

// ============================================================================
// CONFIG SCHEMA
// ============================================================================

/**
 * Letter size options for the display
 */
export const LetterSizeSchema = z.enum(['small', 'medium', 'large'])
  .describe('Size of letters displayed on screen');

export type LetterSize = z.infer<typeof LetterSizeSchema>;

/**
 * I Spy activity configuration
 *
 * Configures a find-the-letter activity where children tap target letters
 * scattered among distractors.
 */
export const ISpyConfigSchema = z.object({
  /**
   * Target letter(s) to find
   * Can be a single letter or array of letters (all considered correct)
   */
  targetLetter: z.union([
    ArabicLetterSchema,
    z.array(ArabicLetterSchema).min(1).max(5),
  ]).describe('The target letter(s) children need to find'),

  /**
   * Alternative forms of the target letter to accept
   * Useful for accepting multiple forms (isolated, initial, etc.)
   */
  targetLetterForms: z.array(ArabicLetterSchema)
    .optional()
    .describe('Alternative forms of the target letter to accept'),

  /**
   * Position form for the target letter
   */
  letterPosition: LetterPositionSchema
    .optional()
    .describe('Which positional form to use for the target letter'),

  /**
   * Distractor letters to include
   * If not provided, random Arabic letters will be used
   */
  distractorLetters: z.array(ArabicLetterSchema)
    .optional()
    .describe('Wrong letters to include (random if not specified)'),

  /**
   * Number of target letters to find
   * @default 5
   */
  targetCount: z.number()
    .int()
    .min(1)
    .max(15)
    .default(5)
    .describe('How many target letters the child needs to find'),

  /**
   * Total letters on screen (targets + distractors)
   * Must be >= targetCount
   * @default 12
   */
  totalLetters: z.number()
    .int()
    .min(3)
    .max(20)
    .default(12)
    .describe('Total number of letters displayed on screen'),

  /**
   * Size of the letters
   * @default 'medium'
   */
  letterSize: LetterSizeSchema
    .optional()
    .default('medium')
    .describe('Size of the letters displayed'),
}).refine(
  (data) => data.totalLetters >= data.targetCount,
  {
    message: 'Total letters must be greater than or equal to target count',
    path: ['totalLetters'],
  }
);

export type ISpyConfig = z.infer<typeof ISpyConfigSchema>;

// ============================================================================
// FULL ACTIVITY SCHEMA
// ============================================================================

/**
 * Complete I Spy activity with base fields and config
 */
export const ISpyActivitySchema = BaseActivitySchema.extend({
  type: z.literal('i_spy'),
  config: ISpyConfigSchema,
});

export type ISpyActivity = z.infer<typeof ISpyActivitySchema>;
