/**
 * Tap Dot Position: tap where the letter's dots go.
 *
 * Write (CM-B7): the letter is a reference (`targetLetter`); wrong dot
 * positions come from a closed list. Read: the target read as a reference.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
} from '../references.ts';
import { readTargetWithPosition } from './drag_dots_to_letter.ts';

export const DOT_POSITIONS = [
  'top',
  'bottom',
  'middle',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

export const TapDotPositionConfigSchema = z.object({
  targetLetter: LetterRefWriteSchema.describe('The dotted letter'),
  distractorPositions: z.array(z.enum(DOT_POSITIONS)).optional()
    .describe('Positions where wrong dots appear'),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

export const TapDotPositionReadSchema = makeReadSchema(
  readTargetWithPosition,
  z.object({
    targetLetter: LetterRefStoredSchema,
    distractorPositions: z.array(z.string()).optional(),
  }).passthrough(),
);

export const TapDotPositionActivitySchema = BaseActivitySchema.extend({
  type: z.literal('tap_dot_position'),
  config: TapDotPositionConfigSchema,
});

export type TapDotPositionConfig = z.infer<typeof TapDotPositionConfigSchema>;
