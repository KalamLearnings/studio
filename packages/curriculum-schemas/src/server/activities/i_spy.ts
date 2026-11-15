/**
 * I Spy: find the target letters in a busy scene. A letter hunt
 * (`letter_hunt.ts`) with the scene size and letter size the Studio form
 * writes (CM-B7).
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import { makeLetterHuntReadSchema, makeLetterHuntWriteSchema } from './letter_hunt.ts';

export const ISpyConfigSchema = makeLetterHuntWriteSchema({
  totalLetters: z.number().int().positive().optional()
    .describe('Total number of letters on screen (targets + distractors)'),
  letterSize: z.enum(['small', 'medium', 'large']).optional()
    .describe('Size of displayed letters'),
}).refine(
  (data) =>
    data.totalLetters === undefined || data.targetCount === undefined ||
    data.totalLetters >= data.targetCount,
  { message: 'totalLetters must be greater than or equal to targetCount', path: ['totalLetters'] },
);

export const ISpyReadSchema = makeLetterHuntReadSchema();

export const ISpyActivitySchema = BaseActivitySchema.extend({
  type: z.literal('i_spy'),
  config: ISpyConfigSchema,
});

export type ISpyConfig = z.infer<typeof ISpyConfigSchema>;
export type ISpyActivity = z.infer<typeof ISpyActivitySchema>;
