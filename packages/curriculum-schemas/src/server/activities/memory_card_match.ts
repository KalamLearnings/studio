/**
 * Memory Card Match: turn cards to find matching letter pairs.
 *
 * Write (CM-B7): `letters` are letter references; `matchingForm` is the form
 * on the matching card (cross-form matching when it differs from `form`).
 * `matchType` and `cardCount` are optional settings (the Studio form writes
 * neither; v1 defaults them). The old string-id letters and the per-letter
 * `audioId`/`audioPath` are not sent: letters own their audio (design 3.1).
 * Read: every element read as a reference, `matchingForm` kept.
 */

import { z } from 'zod';
import { BaseActivitySchema, LetterPositionSchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  isRecord,
  LetterRefStoredSchema,
  makeReadSchema,
  readLetterRef,
} from '../references.ts';
import { HARAKA_IDS } from '../harakat.ts';
import { isValidMadd, MADD_NEEDS_SHORT_VOWEL } from '../madd.ts';

/** One letter: a letter reference plus the matching card's form. */
export const MemoryCardLetterSchema = z.object({
  letterId: z.string().min(1).max(20).regex(/^[a-z_]+$/),
  form: LetterPositionSchema,
  haraka: z.enum(HARAKA_IDS).optional(),
  madd: z.literal(true).optional(),
  matchingForm: LetterPositionSchema.optional()
    .describe('Form for the matching card (cross-form matching when different from form)'),
}).strict().superRefine((ref, ctx) => {
  if (!isValidMadd(ref)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['madd'], message: MADD_NEEDS_SHORT_VOWEL });
  }
});

export type MemoryCardLetter = z.infer<typeof MemoryCardLetterSchema>;

export const MemoryCardMatchConfigSchema = z.object({
  letters: z.array(MemoryCardLetterSchema).min(2)
    .describe('The letters whose cards are matched'),
  cardCount: z.number().int().min(4).max(24).refine((n) => n % 2 === 0, {
    message: 'Card count must be an even number',
  }).optional(),
  matchType: z.enum(['letter_to_letter', 'letter_to_sound', 'form_to_form']).optional(),
  timeLimit: z.number().int().positive().optional(),
  showHints: z.boolean().optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

function readMemoryLetter(value: unknown): unknown {
  const ref = readLetterRef(value);
  if (!isRecord(ref) || !isRecord(value) || value.matchingForm === undefined) return ref;
  return { ...ref, matchingForm: value.matchingForm };
}

export const MemoryCardMatchReadSchema = makeReadSchema(
  (config) =>
    Array.isArray(config.letters)
      ? { ...config, letters: config.letters.map(readMemoryLetter) }
      : config,
  z.object({
    letters: z.array(
      LetterRefStoredSchema.extend({ matchingForm: LetterPositionSchema.optional() }),
    ).min(1),
  }).passthrough(),
);

export const MemoryCardMatchActivitySchema = BaseActivitySchema.extend({
  type: z.literal('memory_card_match'),
  config: MemoryCardMatchConfigSchema,
});
