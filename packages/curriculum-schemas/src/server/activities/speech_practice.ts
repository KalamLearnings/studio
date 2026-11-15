/**
 * Speech Practice (v1): say a letter or a word. v2 captures no read-aloud
 * (ADR 0088, design 2.9): the type gives exposure only, and what it becomes
 * in v2 is CM-C8's decision.
 *
 * Write (CM-B7): the letter is a reference under `targetLetter`, the word a
 * library reference `wordRef`. The legacy `letter` key (a reference on 36
 * PROD rows) and the in-word focus glyph `letter` are not sent; nor a copied
 * `word` string.
 * Read (Studio's shim): a `letter` reference is read as `targetLetter`; a
 * string `letter` (the in-word focus letter) and a `word` string stay as
 * stored; a missing `contentType` is inferred (word, else letter).
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  type ConfigRecord,
  isRecord,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
  readLetterRef,
  WordRefWriteSchema,
} from '../references.ts';

export const SpeechPracticeConfigSchema = z.object({
  contentType: z.enum(['letter', 'word']).optional()
    .describe('Say a letter (default) or a word'),
  targetLetter: LetterRefWriteSchema.optional(),
  wordRef: WordRefWriteSchema.optional(),
  passingScore: z.number().min(0).max(100).optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict().superRefine((config, ctx) => {
  if ((config.contentType ?? 'letter') === 'letter' && config.targetLetter === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetLetter'],
      message: 'A letter practice needs targetLetter',
    });
  }
  if (config.contentType === 'word' && config.wordRef === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wordRef'],
      message: 'A word practice needs wordRef',
    });
  }
});

function normalizeSpeechPractice(config: ConfigRecord): ConfigRecord {
  const next: ConfigRecord = { ...config };
  if (isRecord(config.letter)) {
    if (config.targetLetter === undefined) next.targetLetter = config.letter;
    delete next.letter;
  }
  if (next.targetLetter !== undefined) next.targetLetter = readLetterRef(next.targetLetter);
  if (next.contentType === undefined) {
    next.contentType = next.word || next.wordRef ? 'word' : 'letter';
  }
  return next;
}

export const SpeechPracticeReadSchema = makeReadSchema(
  normalizeSpeechPractice,
  z.object({
    contentType: z.enum(['letter', 'word', 'letter_in_word']),
    targetLetter: LetterRefStoredSchema.optional(),
    word: z.string().optional(),
  }).passthrough().refine(
    (config) =>
      config.contentType === 'letter'
        ? config.targetLetter !== undefined
        : Boolean(config.word) || config.wordRef !== undefined,
    { message: 'Nothing to practise' },
  ),
);

export const SpeechPracticeActivitySchema = BaseActivitySchema.extend({
  type: z.literal('speech_practice'),
  config: SpeechPracticeConfigSchema,
});

export type SpeechPracticeConfig = z.infer<typeof SpeechPracticeConfigSchema>;
