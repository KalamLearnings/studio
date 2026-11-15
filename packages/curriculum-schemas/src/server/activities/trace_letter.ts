/**
 * Trace Letter: trace one letter.
 *
 * Write (CM-B7): the letter is a reference under `targetLetter` (the key the
 * Studio form writes). The legacy glyph `letterForm` (54 of 56 PROD rows) is
 * a v1 field the delivery derives from `targetLetter`, so a save cannot send
 * it; nor `position`, which the reference's `form` replaces.
 * Read (Studio's shim): `letterForm` resolves to `targetLetter` when none is
 * stored, its form taken from `position` when one is stored.
 */

import { z } from 'zod';
import { BaseActivitySchema, LetterPositionSchema, RatioSchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  type ConfigRecord,
  isRecord,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
  readLetterRef,
  withoutKeys,
} from '../references.ts';

export const TraceLetterConfigSchema = z.object({
  targetLetter: LetterRefWriteSchema.describe('The letter to trace'),
  mode: z.enum(['guided', 'freehand']).optional()
    .describe('Guided (with path and stroke order) or freehand'),
  traceCount: z.number().int().positive().optional()
    .describe('How many times the letter must be traced'),
  maxAttempts: z.number().int().positive().optional(),
  recognitionTolerance: RatioSchema.optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

function normalizeTraceLetter(config: ConfigRecord): ConfigRecord {
  const next = withoutKeys(config, ['letterForm', 'position']);
  if (config.targetLetter !== undefined) {
    next.targetLetter = readLetterRef(config.targetLetter);
    return next;
  }
  if (config.letterForm === undefined) return next;
  const ref = readLetterRef(config.letterForm);
  const position = LetterPositionSchema.safeParse(config.position);
  next.targetLetter = isRecord(ref) && position.success ? { ...ref, form: position.data } : ref;
  return next;
}

export const TraceLetterReadSchema = makeReadSchema(
  normalizeTraceLetter,
  z.object({ targetLetter: LetterRefStoredSchema }).passthrough(),
);

export const TraceLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('trace_letter'),
  config: TraceLetterConfigSchema,
});

export type TraceLetterConfig = z.infer<typeof TraceLetterConfigSchema>;
export type TraceLetterActivity = z.infer<typeof TraceLetterActivitySchema>;
