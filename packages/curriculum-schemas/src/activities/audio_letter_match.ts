
import { z } from 'zod';
import { BaseActivityConfigSchema } from '../base';

export const AudioLetterMatchConfigSchema = BaseActivityConfigSchema.extend({
    targetLetter: z.string(),
    distractorLetters: z.array(z.string()),
    playAudioOnStart: z.boolean().optional(),
    allowReplay: z.boolean().optional(),
    showLetterNames: z.boolean().optional(),
});

export type AudioLetterMatchConfig = z.infer<typeof AudioLetterMatchConfigSchema>;

export const AudioLetterMatchActivitySchema = z.object({
    type: z.literal('audio_letter_match'),
    config: AudioLetterMatchConfigSchema,
});

export type AudioLetterMatchActivity = z.infer<typeof AudioLetterMatchActivitySchema>;
