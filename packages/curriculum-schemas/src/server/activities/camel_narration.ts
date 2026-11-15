/**
 * Camel Narration: the camel mascot plays narration clips (no teaching
 * content).
 *
 * Write (CM-B7): each step names its clip by audio library id (`audioId`);
 * `audioUrl` is a v1 hint the server writes from it, so a save cannot send
 * it. Poses come from a closed list.
 * Read: steps as stored (a step needs an `audioId` or an `audioUrl`).
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import { ConditionalAudioSchema, makeReadSchema } from '../references.ts';

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

export const NarrationStepSchema = z.object({
  audioId: z.string().min(1).describe('Audio library id of the clip'),
  pose: CamelPoseSchema.optional(),
  text: z.string().optional().describe('Optional subtitle'),
}).strict();

export const CamelNarrationConfigSchema = z.object({
  narrationSteps: z.array(NarrationStepSchema).min(1),
  defaultPose: CamelPoseSchema.optional(),
  showSubtitles: z.boolean().optional(),
  autoAdvance: z.boolean().optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

export const CamelNarrationReadSchema = makeReadSchema(
  (config) => config,
  z.object({
    narrationSteps: z.array(
      z.object({
        audioId: z.string().optional(),
        audioUrl: z.string().optional(),
        pose: z.string().optional(),
      })
        .passthrough()
        .refine((step) => Boolean(step.audioId) || Boolean(step.audioUrl), {
          message: 'Step has no audio',
        }),
    ).min(1),
  }).passthrough(),
);

export const CamelNarrationActivitySchema = BaseActivitySchema.extend({
  type: z.literal('camel_narration'),
  config: CamelNarrationConfigSchema,
});

export type CamelNarrationConfig = z.infer<typeof CamelNarrationConfigSchema>;
