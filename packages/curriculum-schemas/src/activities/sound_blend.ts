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
 * Speed option for blending
 * - none: No speed mode (used for single letters)
 * - slow: Letters shown in isolated forms (for beginners)
 * - fast: Letters shown in connected word form (for advanced)
 */
export const BlendSpeedSchema = z
  .enum(['none', 'slow', 'fast'])
  .describe('Reading speed: none for letters, slow for learning, fast for fluency');

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
    .default('slow')
    .describe('Reading speed mode'),

  requiredSlides: z.number()
    .int()
    .min(1)
    .max(5)
    .default(2)
    .describe('Number of successful slides required to complete'),

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
