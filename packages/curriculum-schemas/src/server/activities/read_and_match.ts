/**
 * Read and Match (content model CM-B35, ADR 0002; curriculum audit N2): the
 * child reads a vowelled phrase or sentence and taps the picture that
 * matches it. Reading connected text (`read:phrase` / `read:sentence`) and
 * literal comprehension (`comp:literal`), answered by `select`.
 *
 * v2 only: v1 never receives this type (`visibility.ts`,
 * `V2_ONLY_ACTIVITY_TYPES`).
 *
 * Write: `sentence` is a phrase item (`phrase.ts`, CM-B33): reviewed word ids
 * in reading order and the `isSentence` flag, no text. `options` are 2 to 4
 * picture content items (`references.ts`), each with its authored `id`;
 * exactly one has `isCorrect: true`. `playSentenceFirst` says the app reads
 * the whole text aloud before the child answers: the answer is then
 * listening, not reading (ADR 0002, "How evidence is counted"), and the index
 * marks the sentence `audio_model: true`. Default false: the child reads
 * first; a tap on one word, or a "hear it" button, is attempt help
 * (`help.hintCount`, `help.modelAudioPlayed`), not this flag.
 *
 * @example
 * ```
 * {
 *   sentence: { kind: 'phrase', phrase: { wordIds: ['w_hadhihi', 'w_battatun'], isSentence: true } },
 *   options: [
 *     { id: 'o1', kind: 'image', image: { assetId: '…duck' }, isCorrect: true },
 *     { id: 'o2', kind: 'image', image: { assetId: '…bunny' } },
 *     { id: 'o3', kind: 'image', image: { assetId: '…kitten' } },
 *   ],
 * }
 * ```
 *
 * Read: no stored legacy shape exists (new type). The tolerant read takes the
 * phrase through `readPhraseItem` (a `{ wordId }` reference read as its id,
 * the text hint dropped) and each option through `readKindedItem`.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  type ConfigRecord,
  ContentItemStoredSchema,
  ContentItemWriteSchema,
  isRecord,
  makeReadSchema,
  readKindedItem,
} from '../references.ts';
import { PhraseItemStoredSchema, PhraseRefWriteSchema, readPhraseValue } from '../phrase.ts';

export const READ_AND_MATCH_MIN_OPTIONS = 2;
export const READ_AND_MATCH_MAX_OPTIONS = 4;

/** One answer choice: a picture content item with its authored id. */
export const ReadAndMatchOptionSchema = ContentItemWriteSchema.superRefine((option, ctx) => {
  if (option.kind !== 'image') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['kind'],
      message: 'a read_and_match option is a picture (kind image)',
    });
  }
});

export const ReadAndMatchConfigSchema = z
  .object({
    sentence: PhraseRefWriteSchema
      .describe('The phrase or sentence the child reads: reviewed word ids in order'),
    options: z.array(ReadAndMatchOptionSchema)
      .min(READ_AND_MATCH_MIN_OPTIONS, `At least ${READ_AND_MATCH_MIN_OPTIONS} options`)
      .max(READ_AND_MATCH_MAX_OPTIONS, `At most ${READ_AND_MATCH_MAX_OPTIONS} options`)
      .describe('The pictures; exactly one matches the text'),
    playSentenceFirst: z.boolean().optional()
      .describe('The app reads the whole text aloud first (listening, not reading)'),
    conditionalAudio: ConditionalAudioSchema.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    const correct = config.options.filter((o) => o.isCorrect === true).length;
    if (correct !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: `Exactly one option must be correct (found ${correct})`,
      });
    }
    const seen = new Set<string>();
    config.options.forEach((option, n) => {
      if (seen.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options', n, 'id'],
          message: `Option id ${option.id} is repeated`,
        });
      }
      seen.add(option.id);
    });
  });

export const ReadAndMatchActivitySchema = BaseActivitySchema.extend({
  type: z.literal('read_and_match'),
  config: ReadAndMatchConfigSchema,
});

export type ReadAndMatchConfig = z.infer<typeof ReadAndMatchConfigSchema>;
export type ReadAndMatchActivity = z.infer<typeof ReadAndMatchActivitySchema>;

// ============================================================================
// READ SCHEMA
// ============================================================================

function normalizeReadAndMatch(config: ConfigRecord): ConfigRecord {
  const next: ConfigRecord = { ...config };
  if (config.sentence !== undefined) next.sentence = readPhraseValue(config.sentence);
  if (Array.isArray(config.options)) {
    next.options = config.options.map((o) => isRecord(o) ? readKindedItem(o) : o);
  }
  return next;
}

export const ReadAndMatchReadSchema = makeReadSchema(
  normalizeReadAndMatch,
  z.object({
    sentence: PhraseItemStoredSchema,
    options: z.array(ContentItemStoredSchema).min(1),
  }).passthrough(),
);
