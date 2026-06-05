/**
 * Camel Narration Activity Schema
 *
 * Camel mascot delivers spoken narration with animated poses.
 * Used for introductions, overviews, and guided explanations.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base';

/**
 * Available camel poses
 */
export const CamelPoseSchema = z.enum([
  'idle',
  'eating',
  'celebrating',
  'walkingLeft',
  'walkingRight',
  'clapping',
  'wave',
  'thinking',
  'bored',
  'cartwheel',
  'listening',
  'dancing',
  'confetti',
]);

export type CamelPose = z.infer<typeof CamelPoseSchema>;

/**
 * Single narration step with audio and pose
 */
export const NarrationStepSchema = z.object({
  audioId: z.string()
    .min(1)
    .describe('Audio asset ID from the audio library'),

  audioUrl: z.string()
    .url()
    .optional()
    .describe('Resolved audio URL'),

  pose: CamelPoseSchema
    .optional()
    .default('idle')
    .describe('Camel pose during this audio step'),

  text: z.string()
    .optional()
    .describe('Optional subtitle text to display'),
});

export type NarrationStep = z.infer<typeof NarrationStepSchema>;

/**
 * Camel Narration activity configuration
 */
export const CamelNarrationConfigSchema = z.object({
  narrationSteps: z.array(NarrationStepSchema)
    .min(1, 'At least one narration step is required')
    .max(20, 'Maximum 20 narration steps')
    .describe('Sequential audio narration steps'),

  defaultPose: CamelPoseSchema
    .optional()
    .default('idle')
    .describe('Default pose when not playing audio'),

  showSubtitles: z.boolean()
    .optional()
    .default(false)
    .describe('Show text subtitles during narration'),

  autoAdvance: z.boolean()
    .optional()
    .default(true)
    .describe('Auto-advance through narration steps'),
});

export type CamelNarrationConfig = z.infer<typeof CamelNarrationConfigSchema>;

/**
 * Complete Camel Narration activity schema
 */
export const CamelNarrationActivitySchema = BaseActivitySchema.extend({
  type: z.literal('camel_narration'),
  config: CamelNarrationConfigSchema,
});

export type CamelNarrationActivity = z.infer<typeof CamelNarrationActivitySchema>;
