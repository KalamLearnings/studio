
import { z } from 'zod';
import { ArabicLetterSchema, DifficultySchema, BaseActivitySchema } from '../base';

/**
 * Configuration for Slingshot activity
 */
export const SlingshotConfigSchema = z.object({
    targetLetter: ArabicLetterSchema
        .describe('The target letter to hit'),

    distractorLetters: z.array(ArabicLetterSchema)
        .min(1)
        .describe('List of distractor letters on other targets'),

    targetCount: z.number()
        .int()
        .positive()
        .default(3)
        .describe('Number of targets to hit to complete the activity'),

    difficulty: DifficultySchema
        .default('medium')
        .describe('Difficulty level (affects physics stability and target count)'),
});

export type SlingshotConfig = z.infer<typeof SlingshotConfigSchema>;

export const SlingshotActivitySchema = BaseActivitySchema.extend({
    type: z.literal('slingshot'),
    config: SlingshotConfigSchema,
});
