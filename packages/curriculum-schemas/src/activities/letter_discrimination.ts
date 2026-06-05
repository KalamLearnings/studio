
import { z } from 'zod';
import { BaseActivityConfigSchema } from '../base';

export const LetterDiscriminationConfigSchema = BaseActivityConfigSchema.extend({
    targetLetter: z.string(),
    confusableLetter: z.string(),
    prompt: z.string(),
    showInForm: z.enum(['isolated', 'initial', 'medial', 'final', 'all']).optional(),
    playAudio: z.boolean().optional(),
    highlightDifference: z.boolean().optional(),
});

export type LetterDiscriminationConfig = z.infer<typeof LetterDiscriminationConfigSchema>;

export const LetterDiscriminationActivitySchema = z.object({
    type: z.literal('letter_discrimination'),
    config: LetterDiscriminationConfigSchema,
});

export type LetterDiscriminationActivity = z.infer<typeof LetterDiscriminationActivitySchema>;
