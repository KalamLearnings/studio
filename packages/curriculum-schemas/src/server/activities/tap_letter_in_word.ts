/**
 * Tap Letter in Word Activity
 *
 * Student taps specific letter positions within a displayed Arabic word.
 * Matching is position-based: targetIndices lists the logical letter positions the
 * child must tap, which uniquely pins letter + haraka + form + occurrence. The
 * targetLetter (a LetterReference) is retained for display/audio; the backend
 * resolves it to a character for backward-compatible (character-based) matching on
 * older activities that have no targetIndices.
 *
 * @example
 * ```
 * {
 *   type: 'tap_letter_in_word',
 *   config: {
 *     targetWord: 'مطعم',
 *     targetIndices: [0, 3],          // tap both meems (initial + final)
 *     targetLetter: { letterId: 'meem', form: 'initial' },
 *     targetCount: 2
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import {
  ArabicTextSchema,
  BaseActivitySchema,
  ColorSchema,
  LetterReferenceSchema,
} from '../base.ts';
import { LetterRefStoredSchema, makeReadSchema, readLetterRef } from '../references.ts';

/**
 * Configuration for Tap Letter in Word activity
 */
export const TapLetterInWordConfigSchema = z.object({
  targetWord: ArabicTextSchema
    .describe('The Arabic word to display (written from `wordRef` by the server when it is sent)'),

  // CM-D3d (design 3.1 rule 4): the library word; the server writes `targetWord` and
  // `wordRef.text` from it, and derives `targetLetter.form` from the word on every save.
  wordRef: z.object({ wordId: z.string().min(1), text: z.string().optional() })
    .optional()
    .describe('The library word shown; the server writes its text'),

  targetLetter: LetterReferenceSchema
    .describe('The letter to find (with optional haraka)'),

  targetIndices: z.array(z.number().int().nonnegative())
    .optional()
    .describe(
      'Logical letter positions in the word the child must tap. ' +
        'Authoritative match set when present: a position uniquely identifies ' +
        'letter + haraka + form + occurrence, so matching becomes position-based ' +
        '(targetLetter is retained for display/audio). A "logical letter" is a ' +
        'base letter plus its trailing diacritics.',
    ),

  targetCount: z.number()
    .int()
    .positive()
    .default(1)
    .describe('How many times the letter should be tapped'),

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
    .describe(
      'Optional translation/meaning of the word (shown after completion)',
    ),
});

/**
 * Complete Tap Letter in Word activity schema
 */
export const TapLetterInWordActivitySchema = BaseActivitySchema.extend({
  type: z.literal('tap_letter_in_word'),
  config: TapLetterInWordConfigSchema,
});

// Type exports
export type TapLetterInWordConfig = z.infer<typeof TapLetterInWordConfigSchema>;
export type TapLetterInWordActivity = z.infer<
  typeof TapLetterInWordActivitySchema
>;

// ============================================================================
// READ SCHEMA (CM-B7)
// ============================================================================

/**
 * Read (CM-B7): the target letter read as a reference. Its `form` is a
 * placeholder (`isolated` on every PROD row); the server derives it from the
 * word and index (design 3.1 rule 4, S3).
 */
export const TapLetterInWordReadSchema = makeReadSchema(
  (
    config,
  ) => ('targetLetter' in config
    ? { ...config, targetLetter: readLetterRef(config.targetLetter) }
    : config),
  z.object({ targetWord: z.string().min(1), targetLetter: LetterRefStoredSchema }).passthrough(),
);
