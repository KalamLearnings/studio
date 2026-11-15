/**
 * Slingshot: hit the boxes that carry the target letter. Authored by Studio's
 * shared hunt form, so stored as a letter hunt (`letter_hunt.ts`) with a
 * difficulty preset (CM-B7; no PROD rows yet). The old glyph-string schema
 * did not match what the form writes.
 */

import { z } from 'zod';
import { BaseActivitySchema, DifficultySchema } from '../base.ts';
import { makeLetterHuntReadSchema, makeLetterHuntWriteSchema } from './letter_hunt.ts';

export const SlingshotConfigSchema = makeLetterHuntWriteSchema({
  difficulty: DifficultySchema.optional().describe('Difficulty level (affects physics stability)'),
});

export const SlingshotReadSchema = makeLetterHuntReadSchema();

export const SlingshotActivitySchema = BaseActivitySchema.extend({
  type: z.literal('slingshot'),
  config: SlingshotConfigSchema,
});

export type SlingshotConfig = z.infer<typeof SlingshotConfigSchema>;
export type SlingshotActivity = z.infer<typeof SlingshotActivitySchema>;
