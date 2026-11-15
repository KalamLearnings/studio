/**
 * Letter Rain: catch the falling target letters. A letter hunt
 * (`letter_hunt.ts`) with a fall speed and a difficulty preset (CM-B7).
 */

import { z } from 'zod';
import { BaseActivitySchema, DifficultySchema } from '../base.ts';
import { makeLetterHuntReadSchema, makeLetterHuntWriteSchema } from './letter_hunt.ts';

export const LetterRainConfigSchema = makeLetterHuntWriteSchema({
  speed: z.number().positive().optional()
    .describe('Speed multiplier for falling letters (1.0 = normal)'),
  difficulty: DifficultySchema.optional()
    .describe('Overall difficulty preset'),
});

export const LetterRainReadSchema = makeLetterHuntReadSchema();

export type LetterRainConfig = z.infer<typeof LetterRainConfigSchema>;

export const LetterRainActivitySchema = BaseActivitySchema.extend({
  type: z.literal('letter_rain'),
  config: LetterRainConfigSchema,
});

export type LetterRainActivity = z.infer<typeof LetterRainActivitySchema>;
