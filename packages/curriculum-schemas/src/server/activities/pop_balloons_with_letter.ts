/**
 * Pop Balloons with Letter: pop the balloons that carry the target letter.
 * A letter hunt (`letter_hunt.ts`) with a balloon speed.
 *
 * Write (CM-B7): `targetLetter` references, never the legacy glyph
 * `correctLetter` (13 PROD rows, 2 of them disagreeing with `targetLetter`).
 * Read: `correctLetter` resolves to `targetLetter` only when no `targetLetter`
 * is stored; it is then dropped.
 *
 * @example
 * ```
 * { targetLetter: [{ letterId: 'thaa', form: 'isolated', haraka: 'kasra' }],
 *   distractorLetters: [{ letterId: 'taa', form: 'isolated', haraka: 'fatha' }],
 *   balloonSpeed: 1.25 }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import { type ConfigRecord, withoutKeys } from '../references.ts';
import { makeLetterHuntReadSchema, makeLetterHuntWriteSchema } from './letter_hunt.ts';

export const PopBalloonsWithLetterConfigSchema = makeLetterHuntWriteSchema({
  balloonSpeed: z.number().positive().optional()
    .describe('How fast balloons rise (1.0 = normal)'),
});

function readCorrectLetter(config: ConfigRecord): ConfigRecord {
  if (!('correctLetter' in config)) return config;
  const next = withoutKeys(config, ['correctLetter']);
  if (next.targetLetter === undefined) next.targetLetter = config.correctLetter;
  return next;
}

export const PopBalloonsWithLetterReadSchema = makeLetterHuntReadSchema(readCorrectLetter);

export const PopBalloonsWithLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('pop_balloons_with_letter'),
  config: PopBalloonsWithLetterConfigSchema,
});

export type PopBalloonsWithLetterConfig = z.infer<typeof PopBalloonsWithLetterConfigSchema>;
export type PopBalloonsWithLetterActivity = z.infer<typeof PopBalloonsWithLetterActivitySchema>;
