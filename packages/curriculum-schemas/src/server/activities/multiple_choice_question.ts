/**
 * Multiple Choice Question: the child picks the correct option(s).
 *
 * Write (content model CM-B12, design 3.1): every option is a content item
 * (`references.ts`): `kind` on the option and one reference payload (a letter
 * reference, a library word, an asset, a numeral). What is asked is the
 * structured `prompt`: its `kind` and, when the stimulus is not the correct
 * option, its `target` item. Not sent by a save, because the server derives
 * them for v1 (R2): the option display text (`text`), the option image URL
 * (`image`), the container discriminator `mode` (the kind lives on each
 * option, design 3.1 rule 5), the copied stimulus `question` /
 * `questionImage`, `showImages`, and `correctOptionId` (`isCorrect` is on the
 * option). At least one option is correct; several may be (138 PROD rows; the
 * domain check decides where the prompt allows it).
 *
 * @example
 * ```
 * {
 *   prompt: { kind: 'count', target: { kind: 'letter', letter: { letterId: 'thaa', form: 'isolated' } } },
 *   options: [
 *     { id: 'option_0', kind: 'numeral', numeral: 1, isCorrect: false },
 *     { id: 'option_1', kind: 'numeral', numeral: 3, isCorrect: true },
 *   ],
 * }
 * ```
 *
 * Read (every PROD shape, 731 rows): an option keeps v1's rendering order
 * (`MultipleChoiceActivity.tsx` and the projection): with `mode: 'image'` its
 * picture; else its Arabic text (digits a numeral (D17), one glyph a letter,
 * other text a word with the text as hint); else its letter reference; else
 * its picture (URL as hint until S5). The stimulus `questionImage`, else
 * `question.ar`, becomes `prompt.target`. `prompt.kind` is inferred only where
 * the config alone settles it: numeral answers ask to `count`, picture answers
 * are `word_to_picture`. Every other row needs its instruction to tell (CM-D3
 * review list), so it reads without a kind and fails the write schema until
 * then. Empty question text, `mode`, `contentType` and `showImages` are
 * dropped.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  arabicText,
  ConditionalAudioSchema,
  type ConfigRecord,
  ContentItemStoredSchema,
  ContentItemWriteSchema,
  filledString,
  isRecord,
  makeReadSchema,
  type PromptKind,
  PromptStoredSchema,
  PromptWriteSchema,
  readContentText,
  readKindedItem,
  readLetterRef,
  readPrompt,
  readTargetLetter,
  TargetLetterStoredSchema,
  TargetLetterWriteSchema,
  withoutKeys,
} from '../references.ts';

/** One option: a content item with its authored id and `isCorrect`. */
export const MultipleChoiceOptionSchema = ContentItemWriteSchema;

export const MultipleChoiceQuestionConfigSchema = z
  .object({
    prompt: PromptWriteSchema
      .describe('What the question asks, and what it asks about'),
    options: z.array(MultipleChoiceOptionSchema)
      .min(2, 'At least 2 options required')
      .max(6, 'Maximum 6 options allowed')
      .describe('The options, each a content item'),
    targetLetter: TargetLetterWriteSchema.optional()
      .describe('The letter the question practises'),
    layout: z.enum(['vertical', 'horizontal', 'grid']).optional()
      .describe('How to arrange options on screen'),
    randomizeOptions: z.boolean().optional()
      .describe('Shuffle option order to prevent pattern memorization'),
    conditionalAudio: ConditionalAudioSchema.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (!config.options.some((option) => option.isCorrect === true)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'At least one option must be correct',
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

export const MultipleChoiceQuestionActivitySchema = BaseActivitySchema.extend({
  type: z.literal('multiple_choice_question'),
  config: MultipleChoiceQuestionConfigSchema,
});

export type MultipleChoiceOption = z.infer<typeof MultipleChoiceOptionSchema>;
export type MultipleChoiceQuestionConfig = z.infer<typeof MultipleChoiceQuestionConfigSchema>;
export type MultipleChoiceQuestionActivity = z.infer<typeof MultipleChoiceQuestionActivitySchema>;

// ============================================================================
// READ SCHEMA
// ============================================================================

/** Keys v1 or old forms stored that the canonical shape derives or drops. */
const DERIVED_KEYS = [
  'mode',
  'question',
  'questionImage',
  'contentType',
  'showImages',
  'correctOptionId',
] as const;

/** One stored option as a content item, in v1's rendering order. */
export function readOption(option: unknown, imageMode: boolean, correctId: string | null): unknown {
  if (!isRecord(option)) return option;
  if (option.kind !== undefined) return readKindedItem(option);
  const base: ConfigRecord = { id: option.id };
  const isCorrect = option.isCorrect ?? (correctId !== null ? option.id === correctId : undefined);
  if (isCorrect !== undefined) base.isCorrect = isCorrect;
  const image = filledString(option.image) ?? filledString(option.imageUrl);
  if (imageMode && image) return { ...base, kind: 'image', image: { url: image } };
  const text = readContentText(arabicText(option.text));
  if (text) return { ...base, ...text };
  if (option.letter !== undefined && option.letter !== null) {
    return { ...base, kind: 'letter', letter: readLetterRef(option.letter) };
  }
  if (image) return { ...base, kind: 'image', image: { url: image } };
  return base;
}

/** The stimulus of a stored question: `questionImage`, else `question.ar`. */
function readStimulus(config: ConfigRecord): ConfigRecord | null {
  const image = filledString(config.questionImage);
  if (image) return { kind: 'image', image: { url: image } };
  return readContentText(arabicText(config.question));
}

/**
 * The prompt kind when the config alone settles it: numeral answers count,
 * picture answers ask a word's picture. Undefined otherwise.
 */
export function inferPromptKind(options: unknown[]): PromptKind | undefined {
  const correct = options.filter((o) => isRecord(o) && o.isCorrect === true) as ConfigRecord[];
  if (correct.length === 0) return undefined;
  if (correct.every((o) => o.kind === 'numeral')) return 'count';
  if (correct.every((o) => o.kind === 'image')) return 'word_to_picture';
  return undefined;
}

function normalizeMultipleChoice(config: ConfigRecord): ConfigRecord {
  const next = withoutKeys(config, DERIVED_KEYS);
  const imageMode = config.mode === 'image';
  const correctId = filledString(config.correctOptionId);
  const options = Array.isArray(config.options)
    ? config.options.map((o) => readOption(o, imageMode, correctId))
    : config.options;
  if (options !== undefined) next.options = options;
  if (config.targetLetter !== undefined) next.targetLetter = readTargetLetter(config.targetLetter);
  if (config.prompt !== undefined) {
    next.prompt = readPrompt(config.prompt);
  } else {
    const target = readStimulus(config);
    const kind = Array.isArray(options) ? inferPromptKind(options) : undefined;
    if (target || kind) {
      next.prompt = { ...(kind ? { kind } : {}), ...(target ? { target } : {}) };
    }
  }
  return next;
}

export const MultipleChoiceQuestionReadSchema = makeReadSchema(
  normalizeMultipleChoice,
  z.object({
    options: z.array(ContentItemStoredSchema).min(1),
    prompt: PromptStoredSchema.optional(),
    targetLetter: TargetLetterStoredSchema.optional(),
  }).passthrough(),
);
