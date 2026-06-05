/**
 * Multiple Choice Question Activity
 *
 * Student selects one or more correct answers from multiple options.
 * Supports text, images, and audio for questions and options.
 * Multiple correct answers are supported - students must select ALL correct options.
 *
 * @example
 * ```
 * {
 *   type: 'multiple_choice_question',
 *   config: {
 *     question: {
 *       en: 'Which letters are vowels?',
 *       ar: 'ما هي الحروف المتحركة؟'
 *     },
 *     options: [
 *       {
 *         id: 'opt1',
 *         text: { en: 'Alif', ar: 'ألف' },
 *         isCorrect: true
 *       },
 *       {
 *         id: 'opt2',
 *         text: { en: 'Baa', ar: 'باء' },
 *         isCorrect: false
 *       },
 *       {
 *         id: 'opt3',
 *         text: { en: 'Waw', ar: 'واو' },
 *         isCorrect: true
 *       }
 *     ],
 *     layout: 'grid',
 *     randomizeOptions: true
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, LocalizedTextSchema, ArabicLetterSchema } from '../base';

/**
 * Individual option in a multiple choice question
 */
export const MultipleChoiceOptionSchema = z.object({
  id: z.string()
    .describe('Unique identifier for this option'),

  text: LocalizedTextSchema
    .describe('Option text in both languages'),

  isCorrect: z.boolean()
    .describe('Whether this is the correct answer'),

  image: z.string()
    .optional()
    .describe('Optional image URL for visual options'),

  audioUrl: z.string()
    .optional()
    .describe('Optional audio URL to play when option is tapped'),
});

/**
 * Configuration for Multiple Choice Question activity
 */
export const MultipleChoiceQuestionConfigSchema = z.object({
  question: LocalizedTextSchema
    .describe('The question to ask'),

  questionImage: z.string()
    .optional()
    .describe('Optional image for the question'),

  options: z.array(MultipleChoiceOptionSchema)
    .min(2, 'At least 2 options required')
    .max(6, 'Maximum 6 options allowed')
    .describe('Available answer options'),

  correctOptionId: z.string()
    .optional()
    .describe('ID of the correct option (alternative to using targetLetter)'),

  targetLetter: ArabicLetterSchema
    .optional()
    .describe('Correct answer is option whose text starts with this letter (alternative to correctOptionId)'),

  layout: z.enum(['vertical', 'horizontal', 'grid'])
    .default('vertical')
    .describe('How to arrange options on screen'),

  showImages: z.boolean()
    .default(false)
    .describe('Whether options have images'),

  randomizeOptions: z.boolean()
    .default(false)
    .describe('Shuffle option order to prevent pattern memorization'),
}).refine(
  (data) => {
    // Must have at least one correct answer
    const hasCorrectOption = data.options.some((opt) => opt.isCorrect);
    const hasCorrectId = data.correctOptionId !== undefined;
    const hasTargetLetter = data.targetLetter !== undefined;

    return hasCorrectOption || hasCorrectId || hasTargetLetter;
  },
  {
    message: 'Must specify at least one correct answer via isCorrect, correctOptionId, or targetLetter',
    path: ['options'],
  }
);

/**
 * Complete Multiple Choice Question activity schema
 */
export const MultipleChoiceQuestionActivitySchema = BaseActivitySchema.extend({
  type: z.literal('multiple_choice_question'),
  config: MultipleChoiceQuestionConfigSchema,
});

// Type exports
export type MultipleChoiceOption = z.infer<typeof MultipleChoiceOptionSchema>;
export type MultipleChoiceQuestionConfig = z.infer<typeof MultipleChoiceQuestionConfigSchema>;
export type MultipleChoiceQuestionActivity = z.infer<typeof MultipleChoiceQuestionActivitySchema>;
