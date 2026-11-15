/**
 * Drag Dots to Letter: drag the dots onto a dotless letter shape.
 *
 * Write (CM-B7): the letter is a reference (`targetLetter`); its `form`
 * replaces the legacy `position`. Read: a glyph `targetLetter` (1 PROD row)
 * resolves to a reference, its form taken from `position` when stored.
 */

import { z } from 'zod';
import { BaseActivitySchema, LetterPositionSchema } from '../base.ts';
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

export const DragDotsToLetterConfigSchema = z.object({
  targetLetter: LetterRefWriteSchema.describe('The dotted letter to complete'),
  distractorDotsCount: z.number().int().min(0).max(5).optional()
    .describe('Number of extra wrong dots'),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

/** A glyph target takes its form from the legacy `position`; a reference keeps its own. */
export function readTargetWithPosition(config: ConfigRecord): ConfigRecord {
  const next = withoutKeys(config, ['position']);
  if (config.targetLetter === undefined) return next;
  const ref = readLetterRef(config.targetLetter);
  const position = LetterPositionSchema.safeParse(config.position);
  next.targetLetter = typeof config.targetLetter === 'string' && isRecord(ref) && position.success
    ? { ...ref, form: position.data }
    : ref;
  return next;
}

export const DragDotsToLetterReadSchema = makeReadSchema(
  readTargetWithPosition,
  z.object({ targetLetter: LetterRefStoredSchema }).passthrough(),
);

export const DragDotsToLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('drag_dots_to_letter'),
  config: DragDotsToLetterConfigSchema,
});

export type DragDotsToLetterConfig = z.infer<typeof DragDotsToLetterConfigSchema>;
