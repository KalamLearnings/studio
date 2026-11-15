/**
 * Letter Discrimination: pick the target letter from confusable ones. Stored
 * as a letter hunt (`letter_hunt.ts`): the confusable letters are the
 * distractors, and what differs (dots, form, haraka) is derived from the two
 * references (`contrast.ts`), not authored (CM-B7). The old schema's
 * `confusableLetter`, `prompt` and glyph `targetLetter` were never stored.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import { makeLetterHuntReadSchema, makeLetterHuntWriteSchema } from './letter_hunt.ts';

export const LetterDiscriminationConfigSchema = makeLetterHuntWriteSchema({});

export const LetterDiscriminationReadSchema = makeLetterHuntReadSchema();

export const LetterDiscriminationActivitySchema = BaseActivitySchema.extend({
  type: z.literal('letter_discrimination'),
  config: LetterDiscriminationConfigSchema,
});

export type LetterDiscriminationConfig = z.infer<typeof LetterDiscriminationConfigSchema>;
