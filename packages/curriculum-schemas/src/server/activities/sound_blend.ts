/**
 * Sound Blend Activity
 *
 * Children drag a slider across an Arabic word (RTL), blending sounds together.
 * Visual indicators show sound duration (stop = dot, short = small bar, long = big bar).
 *
 * @example
 * ```
 * {
 *   type: 'sound_blend',
 *   config: {
 *     word: 'جَمَل',
 *     segments: [
 *       { sound: 'جَ', duration: 2 },
 *       { sound: 'مَ', duration: 2 },
 *       { sound: 'ل', duration: 1 }
 *     ],
 *     speed: 'segmented',
 *     requiredSlides: 1
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { ArabicTextSchema, BaseActivitySchema } from '../base.ts';
import { BlendFormSchema } from '../blend.ts';
import { LetterRefWriteSchema, makeReadSchema } from '../references.ts';

/**
 * Sound duration schema
 * 1 = stop (dot) - sukun, word-final
 * 2 = short (small bar) - short vowels
 * 3 = long (big bar) - madd letters
 */
export const SoundDurationSchema = z
  .union([z.literal(1), z.literal(2), z.literal(3)])
  .describe('Sound duration: 1=stop, 2=short, 3=long (madd)');

export type SoundDuration = z.infer<typeof SoundDurationSchema>;

/**
 * Sound segment schema - individual sound unit with duration
 */
export const SoundSegmentSchema = z.object({
  sound: z.string()
    .min(1)
    .describe('The sound unit (letter + haraka, e.g., "جَ")'),

  duration: SoundDurationSchema
    .describe('Duration: 1=stop (dot), 2=short (bar), 3=long/madd (big bar)'),
});

export type SoundSegment = z.infer<typeof SoundSegmentSchema>;

/**
 * Content type for sound blend (letter or word)
 */
export const BlendContentTypeSchema = z
  .enum(['letter', 'word'])
  .describe('Content type: letter for single letter, word for full word');

export type BlendContentType = z.infer<typeof BlendContentTypeSchema>;

/**
 * Reading mode for word blending (phonics progression). Newer values:
 * - segmented: isolated letters (sound out each letter)
 * - blended:   contextual letter forms (blend in word context)
 * - fluent:    connected whole word (read fluently)
 *
 * Legacy values are still accepted and normalized for back-compat:
 * - 'none' / 'slow' → 'segmented'
 * - 'fast'          → 'blended'
 */
export const BlendSpeedSchema = z
  .enum(['none', 'slow', 'fast', 'segmented', 'blended', 'fluent'])
  .transform((v) => {
    if (v === 'fast') return 'blended' as const;
    if (v === 'none' || v === 'slow') return 'segmented' as const;
    return v;
  })
  .describe('Reading mode: segmented, blended, or fluent (legacy none/slow/fast accepted)');

export type BlendSpeed = z.infer<typeof BlendSpeedSchema>;

/**
 * The stages of a blend activity (ADR 0078, TECH-DESIGN 4.2). `together` and
 * `alone` are the pair and always present; the order is always
 * model? -> together -> togetherFast? -> alone -> fade?.
 */
export const BLEND_STAGE_ORDER = ['model', 'together', 'togetherFast', 'alone', 'fade'] as const;

export const BlendStageSchema = z.enum(BLEND_STAGE_ORDER);

export type BlendStage = z.infer<typeof BlendStageSchema>;

export const BlendStagesSchema = z
  .array(BlendStageSchema)
  .superRefine((stages, ctx) => {
    const positions = stages.map((s) => BLEND_STAGE_ORDER.indexOf(s));
    if (!stages.includes('together') || !stages.includes('alone')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'stages must include together and alone',
      });
    }
    if (positions.some((p, i) => i > 0 && p <= (positions[i - 1] ?? -1))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'stages must be in the order model, together, togetherFast, alone, fade, each once',
      });
    }
  })
  .describe('Blend stages: together before alone, in order, each once');

/**
 * A word in the library. `wordId` is authoritative; `text` is the word as
 * written (the server fills it from the library row on save).
 */
export const BlendWordReferenceSchema = z.object({
  wordId: z.string().min(1),
  text: z.string().min(1),
});

export type BlendWordReference = z.infer<typeof BlendWordReferenceSchema>;

/**
 * Configuration for Sound Blend activity
 */
export const SoundBlendConfigSchema = z.object({
  contentType: BlendContentTypeSchema
    .default('word')
    .describe('Content type: letter or word'),

  word: ArabicTextSchema
    .describe('The full Arabic word to blend (connected form)'),

  segments: z.array(SoundSegmentSchema)
    .min(1)
    .describe('Sound segments with duration for each letter/sound unit'),

  speed: BlendSpeedSchema
    .default('segmented')
    .describe('Reading mode: segmented, blended, or fluent'),

  requiredSlides: z.number()
    .int()
    .min(1)
    .max(5)
    .default(1)
    .describe('Number of successful slides required to complete'),

  showBothSpeeds: z.boolean()
    .default(false)
    .describe('Show the blending progression (segmented → blended → fluent) in sequence'),

  transliteration: z.string()
    .optional()
    .describe('Optional transliteration for reference (e.g., "jamal")'),

  meaning: z.string()
    .optional()
    .describe('Optional English meaning (e.g., "camel")'),

  // Blend v2 (ADR 0078), all optional: a row with none of them is a legacy
  // row. The server writes them on save, together with `word` and `segments`
  // derived from the word's split.
  blendVersion: z.literal(2)
    .optional()
    .describe('2 when the row points at a library word and its split'),

  wordRef: BlendWordReferenceSchema
    .optional()
    .describe('The library word whose split and audio this activity uses'),

  ending: BlendFormSchema
    .optional()
    .describe('Which form the activity shows and plays; pausal when absent'),

  stages: BlendStagesSchema
    .optional()
    .describe('The slides of the activity; the player default applies when absent'),

  // Letter mode (CM-D3e): the letter blended, a reference into `letters` with its haraka
  // (never a word row). The server writes `word` and `segments` from it for v1.
  targetLetter: LetterRefWriteSchema
    .optional()
    .describe('The letter blended (contentType letter); the server writes word and segments'),
});

/**
 * Complete Sound Blend activity schema
 */
export const SoundBlendActivitySchema = BaseActivitySchema.extend({
  type: z.literal('sound_blend'),
  config: SoundBlendConfigSchema,
});

// Type exports
export type SoundBlendConfig = z.infer<typeof SoundBlendConfigSchema>;
export type SoundBlendActivity = z.infer<typeof SoundBlendActivitySchema>;

// ============================================================================
// READ SCHEMA (CM-B7)
// ============================================================================

/**
 * Read (CM-B7): the stored row as it is (legacy and v2 rows alike). It needs
 * the word: a `word` string or a v2 `wordRef`. The skill a row practises is
 * not stored; CM-B9 derives it from the word.
 */
export const SoundBlendReadSchema = makeReadSchema(
  (config) => config,
  z.object({ word: z.string().optional(), wordRef: z.object({}).passthrough().optional() })
    .passthrough()
    .refine((c) => Boolean(c.word) || c.wordRef !== undefined, {
      message: 'No word to blend',
      path: ['word'],
    }),
);
