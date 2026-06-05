/**
 * Break Time Mini-Game Activity
 *
 * Mental break between lessons with fun, low-stress mini-games.
 * No right/wrong answers - just relaxation and engagement.
 *
 * Variants:
 * - tracing_lines: Draw simple patterns (therapeutic)
 * - dot_tapping: Tap dots in sequence (coordination)
 * - coloring: Color simple images (creative)
 * - memory_game: Match pairs (memory training)
 *
 * @example
 * ```
 * {
 *   type: 'break_time_minigame',
 *   config: {
 *     variant: 'tracing_lines',
 *     duration: 30,
 *     linePattern: 'wavy'
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, DurationSecondsSchema, ColorSchema } from '../base';

/**
 * Configuration for Break Time Mini-Game activity
 */
export const BreakTimeMiniGameConfigSchema = z.object({
  variant: z.enum(['tracing_lines', 'dot_tapping', 'coloring', 'memory_game'])
    .describe('Type of mini-game to play'),

  duration: DurationSecondsSchema
    .default(30)
    .describe('Break duration in seconds'),

  // Tracing Lines variant options
  linePattern: z.enum(['straight', 'wavy', 'zigzag', 'spiral', 'square', 'circle', 'star', 'triangle', 'heart'])
    .optional()
    .describe('Pattern to trace (for tracing_lines variant)'),

  // Dot Tapping variant options
  dotCount: z.number()
    .int()
    .positive()
    .optional()
    .describe('Number of dots to tap (for dot_tapping variant)'),

  dotPattern: z.enum(['random', 'sequence', 'shape'])
    .optional()
    .describe('How dots are arranged (for dot_tapping variant)'),

  color: z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'])
    .optional()
    .describe('Target color to tap (for dot_tapping variant)'),

  // Coloring variant options
  coloringImage: z.string()
    .optional()
    .describe('Image identifier to color (for coloring variant)'),

  availableColors: z.array(ColorSchema)
    .optional()
    .describe('Colors available for coloring (for coloring variant)'),

  // Memory Game variant options
  pairCount: z.number()
    .int()
    .positive()
    .min(2)
    .max(8)
    .optional()
    .describe('Number of pairs to match (for memory_game variant, 2-8)'),
}).refine(
  (data) => {
    // Validate variant-specific required fields
    switch (data.variant) {
      case 'tracing_lines':
        return data.linePattern !== undefined;
      case 'dot_tapping':
        return data.color !== undefined;
      case 'coloring':
        return data.coloringImage !== undefined && data.availableColors !== undefined;
      case 'memory_game':
        return data.pairCount !== undefined;
      default:
        return true;
    }
  },
  (data) => ({
    message: `Missing required fields for variant "${data.variant}"`,
    path: ['variant'],
  })
);

/**
 * Complete Break Time Mini-Game activity schema
 */
export const BreakTimeMiniGameActivitySchema = BaseActivitySchema.extend({
  type: z.literal('break_time_minigame'),
  config: BreakTimeMiniGameConfigSchema,
});

// Type exports
export type BreakTimeMiniGameConfig = z.infer<typeof BreakTimeMiniGameConfigSchema>;
export type BreakTimeMiniGameActivity = z.infer<typeof BreakTimeMiniGameActivitySchema>;
