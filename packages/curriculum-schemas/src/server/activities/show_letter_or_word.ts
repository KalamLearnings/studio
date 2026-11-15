/**
 * Show Letter or Word: show one letter, word or picture (exposure).
 *
 * Write (CM-B7): `contentType` names what is shown; the letter is a reference
 * under `targetLetter`; the word is a library reference `wordRef` (as on
 * sound_blend); a picture is an asset reference `imageRef`. The display
 * strings v1 reads (`word`, `image`, `letter`) are hints the server writes
 * from the references, so a save cannot send them.
 * Read (Studio's shim): the legacy `letter` reference is read as
 * `targetLetter` (they are equal on the 6 rows that hold both); a missing
 * `contentType` is inferred (word, else image, else letter); a stored `word`
 * string stays as the hint, for CM-B9 to resolve against the library.
 */

import { z } from 'zod';
import { BaseActivitySchema, DurationMsSchema } from '../base.ts';
import {
  AssetRefWriteSchema,
  ConditionalAudioSchema,
  type ConfigRecord,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
  readLetterRef,
  withoutKeys,
  WordRefWriteSchema,
} from '../references.ts';

const ContentTypeSchema = z.enum(['letter', 'word', 'image']);

export const ShowLetterOrWordConfigSchema = z.object({
  contentType: ContentTypeSchema
    .describe('Whether to show a single letter, a word or a picture'),
  targetLetter: LetterRefWriteSchema.optional()
    .describe('The letter shown, or the focus letter of a word'),
  wordRef: WordRefWriteSchema.optional()
    .describe('The library word shown (contentType word)'),
  imageRef: AssetRefWriteSchema.optional()
    .describe('The picture shown (contentType image)'),
  imageWidth: z.number().positive().optional(),
  imageHeight: z.number().positive().optional(),
  autoAdvance: z.boolean().optional(),
  displayDuration: DurationMsSchema.optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict().superRefine((config, ctx) => {
  const need = { letter: 'targetLetter', word: 'wordRef', image: 'imageRef' } as const;
  const field = need[config.contentType];
  if (config[field] === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [field],
      message: `contentType ${config.contentType} needs ${field}`,
    });
  }
});

function normalizeShowLetterOrWord(config: ConfigRecord): ConfigRecord {
  const next = withoutKeys(config, ['letter']);
  const target = config.targetLetter ?? config.letter;
  if (target !== undefined) next.targetLetter = readLetterRef(target);
  if (next.contentType === undefined) {
    next.contentType = next.word || next.wordRef
      ? 'word'
      : next.image || next.imageRef
      ? 'image'
      : 'letter';
  }
  return next;
}

export const ShowLetterOrWordReadSchema = makeReadSchema(
  normalizeShowLetterOrWord,
  z.object({
    contentType: ContentTypeSchema,
    targetLetter: LetterRefStoredSchema.optional(),
    word: z.string().optional(),
    wordRef: z.object({ wordId: z.string().min(1) }).passthrough().optional(),
  }).passthrough().superRefine((config, ctx) => {
    const ok = config.contentType === 'letter'
      ? config.targetLetter !== undefined
      : config.contentType === 'word'
      ? Boolean(config.word) || config.wordRef !== undefined
      : Boolean(config.image) || config.imageRef !== undefined;
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contentType'],
        message: `No ${config.contentType} to show`,
      });
    }
  }),
);

export const ShowLetterOrWordActivitySchema = BaseActivitySchema.extend({
  type: z.literal('show_letter_or_word'),
  config: ShowLetterOrWordConfigSchema,
});

export type ShowLetterOrWordConfig = z.infer<typeof ShowLetterOrWordConfigSchema>;
export type ShowLetterOrWordActivity = z.infer<typeof ShowLetterOrWordActivitySchema>;
