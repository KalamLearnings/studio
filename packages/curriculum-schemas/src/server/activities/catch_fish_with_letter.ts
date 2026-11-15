/**
 * Catch Fish with Letter: catch the fish that carry the target letter. A
 * letter hunt (`letter_hunt.ts`) with a fish speed (CM-B7).
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import { makeLetterHuntReadSchema, makeLetterHuntWriteSchema } from './letter_hunt.ts';

export const CatchFishWithLetterConfigSchema = makeLetterHuntWriteSchema({
  fishSpeed: z.number().positive().optional()
    .describe('How fast fish swim (1.0 = normal)'),
});

export const CatchFishWithLetterReadSchema = makeLetterHuntReadSchema();

export const CatchFishWithLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('catch_fish_with_letter'),
  config: CatchFishWithLetterConfigSchema,
});

export type CatchFishWithLetterConfig = z.infer<typeof CatchFishWithLetterConfigSchema>;
export type CatchFishWithLetterActivity = z.infer<typeof CatchFishWithLetterActivitySchema>;
