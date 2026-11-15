/**
 * Sentence Builder (content model CM-B35, ADR 0002; curriculum audit N5): the
 * child puts word tiles in order (right to left) to build a reviewed phrase
 * or sentence. Reading connected text (`read:phrase` / `read:sentence`),
 * answered by `construct`: the evidence `read:*` needs to reach `mastered`
 * (ADR 0002, "What `mastered` needs").
 *
 * v2 only: v1 never receives this type (`visibility.ts`).
 *
 * Write: `sentence` is the phrase item (`phrase.ts`, CM-B33) whose word order
 * is the answer. Its tiles are its own words, named by their paths
 * (`sentence.phrase.wordIds.<n>`, ADR 0090), plus up to 3 `distractorWords`:
 * library words (`{ kind: 'word', word: { wordId } }`) that belong in no
 * slot. `promptImage` is an optional picture shown as the cue.
 * `playSentenceFirst`: the app reads the whole text aloud before the child
 * builds it (dictation): the answer is then listening, not reading, and the
 * index marks it `audio_model: true` (ADR 0002). Default false.
 *
 * Read: no legacy shape (new type). The phrase is read through
 * `readPhraseItem`, the other items through `readKindedItem`.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  type ConfigRecord,
  ContentItemStoredSchema,
  ContentRefWriteSchema,
  isRecord,
  makeReadSchema,
  readKindedItem,
} from '../references.ts';
import { PhraseItemStoredSchema, PhraseRefWriteSchema, readPhraseValue } from '../phrase.ts';

export const SENTENCE_BUILDER_MAX_DISTRACTORS = 3;

const ofKind = (kind: 'word' | 'image') =>
  ContentRefWriteSchema.superRefine((item, ctx) => {
    if (item.kind !== kind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kind'],
        message: `this item is a ${kind} (kind ${kind})`,
      });
    }
  });

export const SentenceBuilderConfigSchema = z
  .object({
    sentence: PhraseRefWriteSchema
      .describe('The phrase or sentence to build; its word order is the answer'),
    distractorWords: z.array(ofKind('word'))
      .max(
        SENTENCE_BUILDER_MAX_DISTRACTORS,
        `At most ${SENTENCE_BUILDER_MAX_DISTRACTORS} extra word tiles`,
      )
      .optional()
      .describe('Extra word tiles that belong in no slot'),
    promptImage: ofKind('image').optional()
      .describe('A picture shown as the cue'),
    playSentenceFirst: z.boolean().optional()
      .describe('The app reads the whole text aloud first (dictation: listening, not reading)'),
    conditionalAudio: ConditionalAudioSchema.optional(),
  })
  .strict();

export const SentenceBuilderActivitySchema = BaseActivitySchema.extend({
  type: z.literal('sentence_builder'),
  config: SentenceBuilderConfigSchema,
});

export type SentenceBuilderConfig = z.infer<typeof SentenceBuilderConfigSchema>;
export type SentenceBuilderActivity = z.infer<typeof SentenceBuilderActivitySchema>;

// ============================================================================
// READ SCHEMA
// ============================================================================

function normalizeSentenceBuilder(config: ConfigRecord): ConfigRecord {
  const next: ConfigRecord = { ...config };
  if (config.sentence !== undefined) next.sentence = readPhraseValue(config.sentence);
  if (Array.isArray(config.distractorWords)) {
    next.distractorWords = config.distractorWords.map((w) => isRecord(w) ? readKindedItem(w) : w);
  }
  if (isRecord(config.promptImage)) next.promptImage = readKindedItem(config.promptImage);
  return next;
}

export const SentenceBuilderReadSchema = makeReadSchema(
  normalizeSentenceBuilder,
  z.object({
    sentence: PhraseItemStoredSchema,
    distractorWords: z.array(ContentItemStoredSchema).optional(),
    promptImage: ContentItemStoredSchema.optional(),
  }).passthrough(),
);
