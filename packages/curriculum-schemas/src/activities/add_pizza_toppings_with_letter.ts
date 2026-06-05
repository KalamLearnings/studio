/**
 * Add Pizza Toppings with Letter Activity
 *
 * Fun cooking game where student adds pizza toppings that contain the target letter.
 * Creative and engaging way to practice letter recognition.
 *
 * @example
 * ```
 * {
 *   type: 'add_pizza_toppings_with_letter',
 *   config: {
 *     targetLetter: 'ب',
 *     toppings: [
 *       {
 *         id: 'topping1',
 *         letter: 'ب',
 *         name: 'Cheese',
 *         emoji: '🧀',
 *         isCorrect: true
 *       },
 *       {
 *         id: 'topping2',
 *         letter: 'ت',
 *         name: 'Tomato',
 *         emoji: '🍅',
 *         isCorrect: false
 *       }
 *     ],
 *     requiredToppingsCount: 3,
 *     pizzaSize: 'medium',
 *     showToppingNames: true
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, ArabicLetterSchema } from '../base';

/**
 * Individual pizza topping
 */
export const PizzaToppingSchema = z.object({
  id: z.string()
    .describe('Unique identifier for this topping'),

  letter: ArabicLetterSchema
    .describe('Letter associated with this topping'),

  name: z.string()
    .describe('Topping name (e.g., "Cheese", "Olive")'),

  emoji: z.string()
    .emoji('Must be a valid emoji')
    .describe('Emoji representation of topping'),

  isCorrect: z.boolean()
    .describe('Whether this topping has the target letter'),
});

/**
 * Configuration for Add Pizza Toppings with Letter activity
 */
export const AddPizzaToppingsWithLetterConfigSchema = z.object({
  targetLetter: ArabicLetterSchema
    .describe('Target letter to find on toppings'),

  targetLetterForms: z.array(ArabicLetterSchema)
    .optional()
    .describe('Alternative forms of target letter'),

  toppings: z.array(PizzaToppingSchema)
    .min(3, 'At least 3 toppings required')
    .describe('Available toppings to choose from'),

  requiredToppingsCount: z.number()
    .int()
    .positive()
    .default(3)
    .describe('How many correct toppings needed to complete pizza'),

  pizzaSize: z.enum(['small', 'medium', 'large'])
    .default('medium')
    .describe('Size of the pizza (affects how many toppings fit)'),

  showToppingNames: z.boolean()
    .default(true)
    .describe('Show topping names or just emojis'),
}).refine(
  (data) => {
    // Ensure enough correct toppings exist
    const correctCount = data.toppings.filter((t) => t.isCorrect).length;
    return correctCount >= data.requiredToppingsCount;
  },
  {
    message: 'Not enough correct toppings to meet requiredToppingsCount',
    path: ['requiredToppingsCount'],
  }
);

/**
 * Complete Add Pizza Toppings with Letter activity schema
 */
export const AddPizzaToppingsWithLetterActivitySchema = BaseActivitySchema.extend({
  type: z.literal('add_pizza_toppings_with_letter'),
  config: AddPizzaToppingsWithLetterConfigSchema,
});

// Type exports
export type PizzaTopping = z.infer<typeof PizzaToppingSchema>;
export type AddPizzaToppingsWithLetterConfig = z.infer<typeof AddPizzaToppingsWithLetterConfigSchema>;
export type AddPizzaToppingsWithLetterActivity = z.infer<typeof AddPizzaToppingsWithLetterActivitySchema>;
