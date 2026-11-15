/**
 * Blend unit and time-mark shapes for sound_blend (SB-B1, TECH-DESIGN 1.1).
 *
 * `BlendUnitSchema` is the stored and projected shape of one syllable as the
 * splitter (`core/domain/blend/blend-word.ts`) writes it. The mark shapes are
 * what the audio jobs write and the player reads: unit boundaries in ms and
 * per-phase marks inside each unit.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/contracts/curriculum-schemas/blend.ts
 *   studio/packages/curriculum-schemas/src/blend.ts
 * It imports only `zod`, so the same source compiles under Deno and Node.
 */

import { z } from 'zod';

export const BlendFormSchema = z
  .enum(['pausal', 'full'])
  .describe('The ending form: pausal (كِتَابْ) or full with case ending or tanween (كِتَابٌ)');

export const BlendUnitKindSchema = z.enum(['cv', 'cvv', 'cvc', 'cvvc', 'cvcc']);

export const BlendUnitTagSchema = z.enum([
  'sukoon',
  'shaddaFirst',
  'shaddaSecond',
  'madd',
  'madd:dagger',
  'tanween',
  'qalqala',
  'wasl',
  'sunLam',
  'seatAlif',
]);

export const BlendVowelSchema = z.enum(['a', 'i', 'u']);

export const BlendUnitSpanSchema = z
  .object({
    from: z.number().int().min(0),
    to: z.number().int().min(0),
    startsMid: z.boolean().optional(),
    endsMid: z.boolean().optional(),
  })
  .refine((s) => s.to >= s.from, { message: 'span.to must be >= span.from' });

export const BlendUnitSchema = z.object({
  id: z.string().regex(/^u\d+$/),
  text: z.string().min(1),
  kind: BlendUnitKindSchema,
  tags: z.array(BlendUnitTagSchema),
  span: BlendUnitSpanSchema,
  vowel: z.object({ v: BlendVowelSchema, long: z.boolean(), tanween: z.boolean() }),
  onset: z
    .object({ c: z.string().min(1), stop: z.boolean(), second: z.boolean(), wasl: z.boolean() })
    .nullable(),
  codas: z.array(
    z.object({
      c: z.string().min(1),
      stop: z.boolean(),
      shaddaFirst: z.boolean(),
      tanween: z.boolean(),
      qalqala: z.boolean(),
    }),
  ),
});

/** A word's units: at least one, ids u0..u(n-1) in reading order. */
export const BlendUnitsSchema = z
  .array(BlendUnitSchema)
  .min(1)
  .refine((units) => units.every((u, i) => u.id === 'u' + i), {
    message: 'unit ids must be u0..u(n-1) in order',
  });

/** One phase inside a unit of a take (TECH-DESIGN 1.1, 2.7). */
export const PhaseMarkSchema = z
  .object({
    unit: z.number().int().min(0),
    kind: z.enum(['hold', 'madd', 'closure', 'short', 'release']),
    startMs: z.number().min(0),
    endMs: z.number().min(0),
  })
  .refine((m) => m.endMs > m.startMs, { message: 'endMs must be > startMs' });

/**
 * Unit boundaries of a take in ms: marks[0] = 0, strictly increasing, one more
 * entry than the word has units.
 */
export function blendMarksSchema(unitCount: number) {
  return z
    .array(z.number().min(0))
    .length(unitCount + 1)
    .refine((m) => m[0] === 0, { message: 'marks[0] must be 0' })
    .refine((m) => m.every((v, i) => i === 0 || v > (m[i - 1] ?? 0)), {
      message: 'marks must be strictly increasing',
    });
}

export type BlendForm = z.infer<typeof BlendFormSchema>;
export type BlendUnitKind = z.infer<typeof BlendUnitKindSchema>;
export type BlendUnitTag = z.infer<typeof BlendUnitTagSchema>;
export type BlendUnit = z.infer<typeof BlendUnitSchema>;
export type PhaseMark = z.infer<typeof PhaseMarkSchema>;
