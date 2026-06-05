
import { z } from 'zod';
import { BaseActivityConfigSchema } from '../base';

export const ColorLetterConfigSchema = BaseActivityConfigSchema.extend({
    letter: z.string(),
    letterForm: z.enum(['isolated', 'initial', 'medial', 'final']).optional(),
    colorPalette: z.array(z.string()).optional(),
    strokeWidth: z.number().optional(),
    allowEraser: z.boolean().optional(),
    saveDrawing: z.boolean().optional(),
});

export type ColorLetterConfig = z.infer<typeof ColorLetterConfigSchema>;

export const ColorLetterActivitySchema = z.object({
    type: z.literal('color_letter'),
    config: ColorLetterConfigSchema,
});

export type ColorLetterActivity = z.infer<typeof ColorLetterActivitySchema>;
