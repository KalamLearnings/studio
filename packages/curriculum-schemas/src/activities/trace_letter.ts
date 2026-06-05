/**
 * Trace Letter Activity
 *
 * Guided letter tracing where student follows stroke order and direction
 * with their finger or stylus. Validates tracing accuracy.
 *
 * @example
 * ```
 * {
 *   type: 'trace_letter',
 *   config: {
 *     letterForm: 'ب',
 *     position: 'isolated',
 *     traceCount: 1,
 *     maxAttempts: 5,
 *     recognitionTolerance: 0.7
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, ArabicLetterSchema, LetterPositionSchema, RatioSchema } from '../base';

/**
 * Configuration for Trace Letter activity
 */
export const TraceLetterConfigSchema = z.object({
  letterForm: ArabicLetterSchema
    .describe('The Arabic letter to trace'),

  position: LetterPositionSchema
    .default('isolated')
    .describe('Letter position/form to trace (affects appearance in Arabic)'),

  traceCount: z.number()
    .int()
    .positive()
    .default(1)
    .describe('How many times student must successfully trace the letter'),

  maxAttempts: z.number()
    .int()
    .positive()
    .default(5)
    .describe('Maximum attempts allowed before activity is marked as failed'),

  recognitionTolerance: RatioSchema
    .default(0.7)
    .describe('How strict tracing validation is (0.0 = very strict, 1.0 = very lenient)'),
});

/**
 * Complete Trace Letter activity schema
 */
export const TraceLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('trace_letter'),
  config: TraceLetterConfigSchema,
});

// Type exports
export type TraceLetterConfig = z.infer<typeof TraceLetterConfigSchema>;
export type TraceLetterActivity = z.infer<typeof TraceLetterActivitySchema>;
