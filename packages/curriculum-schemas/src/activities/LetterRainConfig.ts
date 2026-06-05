
import { z } from 'zod';
import { ArabicLetterSchema, DifficultySchema, MultiplierSchema, BaseActivitySchema } from '../base';

/**
 * Configuration for Letter Rain activity
 */
export const LetterRainConfigSchema = z.object({
    targetLetter: ArabicLetterSchema
        .describe('The target letter to catch'),

    distractorLetters: z.array(ArabicLetterSchema)
        .min(1)
        .describe('List of distractor letters to avoid'),

    targetCount: z.number()
        .int()
        .positive()
        .default(5)
        .describe('Number of correct letters to catch to complete the activity'),

    speed: MultiplierSchema
        .default(1.0)
        .describe('Speed multiplier for falling letters'),

    difficulty: DifficultySchema
        .default('medium')
        .describe('Difficulty level (affects spawn rate and speed)'),
});

export type LetterRainConfig = z.infer<typeof LetterRainConfigSchema>;

export const LetterRainActivitySchema = BaseActivitySchema.extend({
    type: z.literal('letter_rain'),
    config: LetterRainConfigSchema,
});
