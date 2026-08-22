/**
 * Drag Haraka to Word Activity
 *
 * Teaches reading harakat IN CONTEXT. A word is shown in connected Arabic
 * script with its marks in place, except on one letter. The child drags the
 * missing mark onto that letter — above for fatha/damma/sukoon/shadda, below
 * for kasra. Placement is the whole point: the wrong side is a different
 * sound, not a near miss.
 *
 * Distinct from drag_haraka_to_letter, which does this on a single isolated
 * letter. Here the letters are connected and change shape by position, so the
 * child must find one letter inside a word.
 *
 * The word is stored FULLY VOWELLED — it is the answer key. `blankIndices`
 * says only which letters' marks to HIDE at render time; the mark the child
 * drags and the mark scored as correct are both read off the word itself, so
 * they cannot disagree. This is the same invariant drive_to_sukoon relies on.
 *
 * `blankIndices` is an array from the outset. One entry vowels a single letter;
 * several vowel the whole word. Nothing downstream distinguishes the two.
 *
 * @example
 * ```
 * {
 *   type: 'drag_haraka_to_word',
 *   config: {
 *     word: { wordId: 'w_123', text: 'مَرْيَم' },
 *     blankIndices: [0],
 *     distractorHarakat: ['kasra', 'damma']
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, HARAKA_CHARS, HarakaTypeSchema } from '../base';

/** Combining marks that count as a haraka, from the shared HARAKA_CHARS map. */
const HARAKA_MARKS: string[] = Object.values(HARAKA_CHARS);

/**
 * Split a word into per-letter sound units (base letter plus its combining
 * marks), mirroring how the app splits it at render time so validation counts
 * the same letters the child will see.
 */
export function wordLetterUnits(text: string): string[] {
  const units: string[] = [];
  for (const ch of text.normalize('NFKC')) {
    // Any combining mark belongs to the preceding letter.
    if (/[ً-ٰٟ]/.test(ch) && units.length > 0) {
      units[units.length - 1] += ch;
    } else {
      units.push(ch);
    }
  }
  return units;
}

/** Whether the letter at `index` carries a mark the child could drag back. */
export function letterHasHaraka(text: string, index: number): boolean {
  const unit = wordLetterUnits(text)[index];
  if (!unit) return false;
  return unit.split('').some((ch) => HARAKA_MARKS.includes(ch));
}

/**
 * A word reference into curriculum_words. `wordId` is authoritative — the
 * library row is the source of truth for text, translation, audio and letter
 * composition. `text` is a cached display hint only.
 */
export const HarakaWordReferenceSchema = z.object({
  wordId: z.string()
    .min(1)
    .optional()
    .describe('curriculum_words id — authoritative reference'),

  text: z.string()
    .min(1)
    .describe('The Arabic word, FULLY VOWELLED — this is the answer key'),
});

/**
 * Configuration for Drag Haraka to Word activity
 */
export const DragHarakaToWordConfigSchema = z.object({
  word: HarakaWordReferenceSchema
    .describe('The word to vowel (curriculum_words reference)'),

  blankIndices: z.array(z.number().int().min(0))
    .min(1)
    .describe(
      'Letter positions whose marks are hidden for the child to place. ' +
        'One entry today; several vowel the whole word.',
    ),

  distractorHarakat: z.array(HarakaTypeSchema)
    .max(4)
    .default([])
    .describe('Additional harakat offered alongside the correct one'),
}).superRefine((config, ctx) => {
  const units = wordLetterUnits(config.word.text);

  for (const index of config.blankIndices) {
    if (index >= units.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `blankIndices contains ${index}, but the word has ${units.length} letters.`,
        path: ['blankIndices'],
      });
      continue;
    }
    // A blanked letter must actually carry a mark, or there is nothing for the
    // child to drag back and the round cannot be completed.
    if (!letterHasHaraka(config.word.text, index)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The letter at position ${index} carries no haraka, so blanking it ` +
          'leaves nothing to place. Vowel that letter in the word first.',
        path: ['blankIndices'],
      });
    }
  }

  if (new Set(config.blankIndices).size !== config.blankIndices.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'blankIndices must not repeat a position.',
      path: ['blankIndices'],
    });
  }
});

/**
 * Complete Drag Haraka to Word activity schema
 */
export const DragHarakaToWordActivitySchema = BaseActivitySchema.extend({
  type: z.literal('drag_haraka_to_word'),
  config: DragHarakaToWordConfigSchema,
});

// Type exports
export type HarakaWordReference = z.infer<typeof HarakaWordReferenceSchema>;
export type DragHarakaToWordConfig = z.infer<typeof DragHarakaToWordConfigSchema>;
export type DragHarakaToWordActivity = z.infer<typeof DragHarakaToWordActivitySchema>;
