/**
 * Sound Blend Activity
 *
 * Children drag a slider across an Arabic word (RTL), blending sounds together.
 * Visual indicators show sound duration (stop = dot, short = small bar, long = big bar).
 */

import { z } from 'zod';
import { ArabicTextSchema, BaseActivitySchema } from '../base';

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
    .default(2)
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
