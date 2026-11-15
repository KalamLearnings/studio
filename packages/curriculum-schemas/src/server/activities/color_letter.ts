/**
 * Color Letter: colour in one letter. The letter is a reference under
 * `letter` (25 of 25 PROD rows, the key the Studio form writes and v1 reads;
 * design 3.1 rule 1, per-type field names stay). The old schema's
 * `letter_id` + `letterForm` were never stored (CM-B7).
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
  readLetterRef,
} from '../references.ts';

export const ColorLetterConfigSchema = z.object({
  letter: LetterRefWriteSchema.describe('The letter to colour'),
  colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(),
  strokeWidth: z.number().positive().optional(),
  allowEraser: z.boolean().optional(),
  saveDrawing: z.boolean().optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

export const ColorLetterReadSchema = makeReadSchema(
  (config) => ('letter' in config ? { ...config, letter: readLetterRef(config.letter) } : config),
  z.object({ letter: LetterRefStoredSchema }).passthrough(),
);

export const ColorLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('color_letter'),
  config: ColorLetterConfigSchema,
});
