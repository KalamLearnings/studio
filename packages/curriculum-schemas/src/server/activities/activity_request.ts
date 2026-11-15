/**
 * Activity Request: a placeholder for an activity not built yet (no teaching
 * content).
 *
 * Write (CM-B7): a description of the wanted activity is required, so an
 * empty config is rejected (design 5: empty configs rejected from day one;
 * 8 of the 9 PROD rows are `{}`). Read: any non-empty config, a stored
 * `targetLetter` read as a reference.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import { ConditionalAudioSchema, makeReadSchema, readTargetLetter } from '../references.ts';

export const ActivityRequestConfigSchema = z.object({
  description: z.string().trim().min(1).describe('The activity to be built'),
  notes: z.string().optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

export const ActivityRequestReadSchema = makeReadSchema(
  (
    config,
  ) => ('targetLetter' in config
    ? { ...config, targetLetter: readTargetLetter(config.targetLetter) }
    : config),
  z.object({}).passthrough(),
);

export const ActivityRequestActivitySchema = BaseActivitySchema.extend({
  type: z.literal('activity_request'),
  config: ActivityRequestConfigSchema,
});

export type ActivityRequestConfig = z.infer<typeof ActivityRequestConfigSchema>;
