/**
 * Drag Items to Target Activity
 *
 * Student drags items (letters, images, etc.) to correct drop zones.
 * Supports multiple variants for different gameplay styles.
 *
 * Variants:
 * - animal_mouth: Drag letters to feed animal (e.g., "Feed the cow letters with ب")
 * - word_slots: Drag letters to complete a word template
 * - letter_matching: Match letters to their forms or sounds
 *
 * @example Animal Mouth
 * ```
 * {
 *   type: 'drag_items_to_target',
 *   config: {
 *     variant: 'animal_mouth',
 *     targetAnimal: 'cow',
 *     targetLetter: 'ب',
 *     draggableItems: [
 *       { id: 'item1', letter: 'ب', isCorrect: true },
 *       { id: 'item2', letter: 'ت', isCorrect: false },
 *       { id: 'item3', letter: 'ب', isCorrect: true }
 *     ],
 *     correctCount: 2,
 *     snapToTarget: true
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema, ArabicLetterSchema, ArabicTextSchema } from '../base';

/**
 * Individual draggable item
 */
export const DraggableItemSchema = z.object({
  id: z.string()
    .describe('Unique identifier for this item'),

  letter: ArabicLetterSchema
    .describe('Letter displayed on this item'),

  isCorrect: z.boolean()
    .describe('Whether this is a correct item to drag to target'),

  initialPosition: z.object({
    x: z.number(),
    y: z.number(),
  })
    .optional()
    .describe('Starting position (auto-scattered if not provided)'),
});

/**
 * Configuration for Drag Items to Target activity
 */
export const DragItemsToTargetConfigSchema = z.object({
  variant: z.enum(['animal_mouth', 'word_slots', 'letter_matching'])
    .describe('Gameplay style/variant'),

  // Animal Mouth variant
  targetAnimal: z.enum(['cow', 'donkey', 'sheep', 'bird'])
    .optional()
    .describe('Which animal to feed (for animal_mouth variant)'),

  targetLetter: ArabicLetterSchema
    .optional()
    .describe('Target letter for animal_mouth variant'),

  // Word Slots variant
  targetWord: ArabicTextSchema
    .optional()
    .describe('Word to complete (for word_slots variant)'),

  // Common
  draggableItems: z.array(DraggableItemSchema)
    .min(1, 'At least one draggable item required')
    .describe('Items student can drag'),

  correctCount: z.number()
    .int()
    .positive()
    .describe('How many correct items must be dragged'),

  showPreview: z.boolean()
    .default(false)
    .describe('Show preview of where items should go'),

  snapToTarget: z.boolean()
    .default(true)
    .describe('Auto-snap items when close to target'),
}).refine(
  (data) => {
    // Validate variant-specific required fields
    if (data.variant === 'animal_mouth') {
      return data.targetAnimal !== undefined && data.targetLetter !== undefined;
    }
    if (data.variant === 'word_slots') {
      return data.targetWord !== undefined;
    }
    return true;
  },
  (data) => ({
    message: `Missing required fields for variant "${data.variant}"`,
    path: ['variant'],
  })
).refine(
  (data) => {
    // Ensure enough correct items exist
    const correctItemCount = data.draggableItems.filter((item) => item.isCorrect).length;
    return correctItemCount >= data.correctCount;
  },
  {
    message: 'Not enough correct items in draggableItems to meet correctCount',
    path: ['correctCount'],
  }
);

/**
 * Complete Drag Items to Target activity schema
 */
export const DragItemsToTargetActivitySchema = BaseActivitySchema.extend({
  type: z.literal('drag_items_to_target'),
  config: DragItemsToTargetConfigSchema,
});

// Type exports
export type DraggableItem = z.infer<typeof DraggableItemSchema>;
export type DragItemsToTargetConfig = z.infer<typeof DragItemsToTargetConfigSchema>;
export type DragItemsToTargetActivity = z.infer<typeof DragItemsToTargetActivitySchema>;
