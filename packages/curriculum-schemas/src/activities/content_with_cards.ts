/**
 * Content With Cards Activity Schema
 *
 * Displays content (letter, word, or image) at the top with 1-4 cards at the bottom.
 * Supports both interactive (choice) and informational (display-only) modes.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base';

// ============================================================================
// CONFIG SCHEMA
// ============================================================================

/**
 * Card option schema
 */
export const ContentWithCardsOptionSchema = z.object({
  id: z.string().describe('Unique identifier for the card'),
  text: z.string().optional().describe('Text/letter to display on card'),
  image: z.string().url().optional().describe('Image URL for card'),
  isCorrect: z.boolean().optional().default(false).describe('Whether this is a correct answer (for interactive mode)'),
});

/**
 * Content with cards activity configuration
 */
export const ContentWithCardsConfigSchema = z.object({
  content: z.object({
    letter: z.string().optional().describe('Letter to display at top'),
    word: z.string().optional().describe('Word to display at top'),
    image: z.string().url().optional().describe('Image URL to display at top'),
  }).optional().describe('Content to display in the top area'),

  contentType: z.enum(['letter', 'word', 'image'])
    .optional()
    .default('letter')
    .describe('Type of content to display'),

  cards: z.array(ContentWithCardsOptionSchema)
    .min(1)
    .max(4)
    .describe('Array of 1-4 card options'),

  cardMode: z.enum(['letter', 'word', 'image'])
    .optional()
    .default('letter')
    .describe('Display mode for cards: letter, word, or image'),

  interactive: z.boolean()
    .optional()
    .default(true)
    .describe('Whether cards are tappable (true) or display-only (false)'),

  randomizeCards: z.boolean()
    .optional()
    .default(false)
    .describe('Whether to randomize card order'),
});

export type ContentWithCardsConfig = z.infer<typeof ContentWithCardsConfigSchema>;

// ============================================================================
// FULL ACTIVITY SCHEMA
// ============================================================================

/**
 * Complete content with cards activity schema
 */
export const ContentWithCardsActivitySchema = BaseActivitySchema.extend({
  type: z.literal('content_with_cards'),
  config: ContentWithCardsConfigSchema,
});

export type ContentWithCardsActivity = z.infer<typeof ContentWithCardsActivitySchema>;
