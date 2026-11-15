/**
 * Drag Haraka to Letter: drag the right haraka onto a letter.
 *
 * Write (CM-B7): `targetLetter` is a reference; the haraka taught stays in
 * `harakaType` (v1 reads it; 135 of 140 PROD rows); distractors are wrong
 * harakat (`distractorHarakat`), wrong letters (`distractorLetters`,
 * references) or both. `correctSoundUrl` is not sent: the letter owns its
 * sound (design 3.1).
 * Read: tolerates the 5 rows without `harakaType` and the 1 row without a
 * target (CM-B8b and the backfill report them).
 */

import { z } from 'zod';
import { BaseActivitySchema, HarakaTypeSchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
  readLetterList,
  readLetterRef,
} from '../references.ts';

export const DragHarakaToLetterConfigSchema = z.object({
  targetLetter: LetterRefWriteSchema
    .describe('The letter to place the haraka on'),
  harakaType: HarakaTypeSchema
    .describe('The haraka to drag (a HARAKA_META id)'),
  distractorLetters: z.array(LetterRefWriteSchema).min(1).optional()
    .describe('Wrong letters (multi-letter mode)'),
  distractorHarakat: z.array(HarakaTypeSchema).min(1).optional()
    .describe('Wrong harakat scattered as draggable options (exclude the target harakaType)'),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

export const DragHarakaToLetterReadSchema = makeReadSchema(
  (config) => {
    const next = { ...config };
    if ('targetLetter' in next) next.targetLetter = readLetterRef(next.targetLetter);
    if ('distractorLetters' in next) {
      next.distractorLetters = readLetterList(next.distractorLetters);
    }
    return next;
  },
  z.object({
    targetLetter: LetterRefStoredSchema.optional(),
    harakaType: HarakaTypeSchema.optional(),
    distractorLetters: z.array(LetterRefStoredSchema).optional(),
    distractorHarakat: z.array(HarakaTypeSchema).optional(),
  }).passthrough().refine((c) => c.targetLetter !== undefined || c.harakaType !== undefined, {
    message: 'Neither a target letter nor a haraka',
  }),
);

export const DragHarakaToLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('drag_haraka_to_letter'),
  config: DragHarakaToLetterConfigSchema,
});

export type DragHarakaToLetterConfig = z.infer<typeof DragHarakaToLetterConfigSchema>;
export type DragHarakaToLetterActivity = z.infer<typeof DragHarakaToLetterActivitySchema>;
