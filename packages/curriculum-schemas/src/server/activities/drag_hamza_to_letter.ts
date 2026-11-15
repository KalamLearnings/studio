/**
 * Drag Hamza to Letter: drag the hamza to the right place on a letter.
 *
 * Write (CM-B7): `targetLetter` is a reference (the old schema wanted a
 * glyph, defaulting to ا); `correctPosition` is required. Read: tolerates a
 * missing `correctPosition` (the one PROD row has none).
 */

import { z } from 'zod';
import { BaseActivitySchema, HamzaPositionSchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
  readLetterRef,
} from '../references.ts';

export const DragHamzaToLetterConfigSchema = z.object({
  targetLetter: LetterRefWriteSchema
    .describe('The letter to place the hamza on (typically alif)'),
  correctPosition: HamzaPositionSchema
    .describe('The correct position for the hamza (above, below, on_line)'),
  showAllPositions: z.boolean().optional()
    .describe('Whether to show every drop zone or only the correct one'),
  distractorPositions: z.array(HamzaPositionSchema).optional()
    .describe('Additional incorrect positions to show as drop zones'),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

export const DragHamzaToLetterReadSchema = makeReadSchema(
  (
    config,
  ) => ('targetLetter' in config
    ? { ...config, targetLetter: readLetterRef(config.targetLetter) }
    : config),
  z.object({ targetLetter: LetterRefStoredSchema, correctPosition: HamzaPositionSchema.optional() })
    .passthrough(),
);

export const DragHamzaToLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('drag_hamza_to_letter'),
  config: DragHamzaToLetterConfigSchema,
});

export type DragHamzaToLetterConfig = z.infer<typeof DragHamzaToLetterConfigSchema>;
export type DragHamzaToLetterActivity = z.infer<typeof DragHamzaToLetterActivitySchema>;
