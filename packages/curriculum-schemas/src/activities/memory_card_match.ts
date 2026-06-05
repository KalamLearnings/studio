import { z } from 'zod';
import { BaseActivityConfigSchema } from '../base';

const LetterPositionSchema = z.enum(['isolated', 'initial', 'medial', 'final']);

/**
 * Letter reference for memory card matching
 * - letterId: The letter identifier (e.g., 'ba', 'alif')
 * - form: The form shown on the first card (isolated, initial, medial, final)
 * - matchingForm: Optional - the form for the matching card (for cross-form matching)
 * - audioId: Optional - audio asset ID for letter_to_sound matching
 * - audioPath: Optional - audio storage path for backend URL resolution
 */
export const MemoryCardLetterSchema = z.object({
    letterId: z.string(),
    form: LetterPositionSchema.default('isolated'),
    matchingForm: LetterPositionSchema.optional(),
    audioId: z.string().optional(),
    audioPath: z.string().optional(),
});

export type MemoryCardLetter = z.infer<typeof MemoryCardLetterSchema>;

export const MemoryCardMatchConfigSchema = BaseActivityConfigSchema.extend({
    letters: z.union([
        z.array(z.string()),
        z.array(MemoryCardLetterSchema),
    ]),
    cardCount: z.number().optional(),
    matchType: z.enum(['letter_to_letter', 'letter_to_sound', 'form_to_form']).optional(),
    timeLimit: z.number().optional(),
    showHints: z.boolean().optional(),
});

export type MemoryCardMatchConfig = z.infer<typeof MemoryCardMatchConfigSchema>;

export const MemoryCardMatchActivitySchema = z.object({
    type: z.literal('memory_card_match'),
    config: MemoryCardMatchConfigSchema,
});

export type MemoryCardMatchActivity = z.infer<typeof MemoryCardMatchActivitySchema>;
