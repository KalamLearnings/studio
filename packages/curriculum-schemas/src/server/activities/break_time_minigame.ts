/**
 * Break Time Mini-Game Activity
 *
 * Mental break between lessons with fun, low-stress mini-games.
 * No right/wrong answers - just relaxation and engagement.
 *
 * Variants:
 * - tracing_lines: Draw simple patterns (therapeutic)
 * - dot_tapping: Tap dots in sequence (coordination)
 * - coloring: Color simple images (creative)
 * - memory_game: Match pairs (memory training)
 * - tap_shapes: Tap all instances of a target shape
 * - odd_one_out: Tap the one item that does not match the group
 * - attribute_tap: Tap every item that matches a shape, a color, or both
 * - match_two: Tap the two items that look the same
 * - pattern_completion: Fill the blank at the end of a color pattern
 *
 * @example
 * ```
 * {
 *   type: 'break_time_minigame',
 *   config: {
 *     variant: 'tap_shapes',
 *     targetShape: 'circle',
 *     targetCount: 5,
 *     totalShapes: 10
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import {
  BaseActivitySchema,
  ColorSchema,
  DurationSecondsSchema,
  HarakaTypeSchema,
  ShapeTypeSchema,
} from '../base.ts';
import { makeReadSchema } from '../references.ts';

const BreakLetterSchema = z.object({
  letterId: z.string().min(1),
  form: z.enum(['isolated', 'initial', 'medial', 'final']),
  haraka: HarakaTypeSchema.optional(),
  /** Cached glyph so the app can draw the letter without the letters table. */
  display: z.string().min(1).optional(),
});

const BreakWordSchema = z.object({
  wordId: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
});

const BreakAssetSchema = z.object({
  assetId: z.string().optional(),
  url: z.string().optional(),
  path: z.string().optional(),
});

/** One tappable thing: a letter, a word, an image, or a sound. */
export const BreakContentItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['letter', 'word', 'image', 'audio']),
  letter: BreakLetterSchema.optional(),
  word: BreakWordSchema.optional(),
  image: BreakAssetSchema.optional(),
  audio: BreakAssetSchema.optional(),
});

export type BreakContentItem = z.infer<typeof BreakContentItemSchema>;

function contentReady(item: BreakContentItem | undefined): item is BreakContentItem {
  if (!item) return false;
  switch (item.kind) {
    case 'letter':
      return !!item.letter?.letterId && !!item.letter.display;
    case 'word':
      return !!item.word?.text;
    case 'image':
      return !!(item.image?.url || item.image?.path);
    case 'audio':
      return !!item.audio?.url;
    default:
      return false;
  }
}

function contentKey(item: BreakContentItem): string {
  switch (item.kind) {
    case 'letter':
      return `letter:${item.letter?.letterId}:${item.letter?.form}:${item.letter?.haraka ?? ''}`;
    case 'word':
      return `word:${item.word?.wordId || item.word?.text}`;
    case 'image':
      return `image:${item.image?.assetId || item.image?.url || item.image?.path}`;
    case 'audio':
      return `audio:${item.audio?.assetId || item.audio?.url}`;
    default:
      return item.id;
  }
}

/** Named colors the break-time shape puzzles share with the Studio form. */
const BreakColorSchema = z.enum([
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
]);

/**
 * Configuration for Break Time Mini-Game activity
 */
export const BreakTimeMiniGameConfigSchema = z.object({
  variant: z.enum([
    'tracing_lines',
    'dot_tapping',
    'coloring',
    'memory_game',
    'tap_shapes',
    'odd_one_out',
    'attribute_tap',
    'match_two',
    'pattern_completion',
  ])
    .describe('Type of mini-game to play'),

  duration: DurationSecondsSchema
    .optional()
    .describe(
      'Break duration in seconds (not used for memory_game or tap_shapes)',
    ),

  // Tracing Lines variant options
  linePattern: z.enum(['straight', 'wavy', 'zigzag', 'spiral'])
    .optional()
    .describe('Pattern to trace (for tracing_lines variant)'),

  // Dot Tapping variant options
  dotCount: z.number()
    .int()
    .positive()
    .optional()
    .describe('Number of dots to tap (for dot_tapping variant)'),

  dotPattern: z.enum(['random', 'sequence', 'shape'])
    .optional()
    .describe('How dots are arranged (for dot_tapping variant)'),

  color: z.string()
    .optional()
    .describe('Target color for dot_tapping variant'),

  // Coloring variant options
  coloringImage: z.string()
    .optional()
    .describe('Image identifier to color (for coloring variant)'),

  availableColors: z.array(ColorSchema)
    .optional()
    .describe('Colors available for coloring (for coloring variant)'),

  // Memory Game variant options
  cardCount: z.number()
    .int()
    .positive()
    .min(6)
    .max(16)
    .refine((val) => val % 2 === 0, 'Card count must be a multiple of 2')
    .optional()
    .describe('Total number of cards (must be multiple of 2, min 6, max 16)'),

  // Legacy pairCount support (deprecated, use cardCount instead)
  pairCount: z.number()
    .int()
    .positive()
    .min(2)
    .max(8)
    .optional()
    .describe('DEPRECATED: Number of pairs to match (use cardCount instead)'),

  // Tap Shapes variant options
  targetShape: ShapeTypeSchema
    .optional()
    .describe('Target shape to tap (for tap_shapes variant)'),

  targetCount: z.number()
    .int()
    .positive()
    .min(3)
    .max(10)
    .optional()
    .describe('Number of target shapes to find (for tap_shapes variant)'),

  totalShapes: z.number()
    .int()
    .positive()
    .min(5)
    .max(20)
    .optional()
    .describe(
      'Total number of shapes displayed on screen (for tap_shapes, attribute_tap, and match_two)',
    ),

  // Odd one out: one item differs by shape or by color
  oddAttribute: z.enum(['shape', 'color'])
    .optional()
    .describe('Which attribute the odd item differs by (for odd_one_out)'),

  commonShape: ShapeTypeSchema
    .optional()
    .describe('Shape shared by the group (for odd_one_out)'),

  oddShape: ShapeTypeSchema
    .optional()
    .describe('Shape of the single odd item when oddAttribute is shape'),

  commonColor: BreakColorSchema
    .optional()
    .describe('Color shared by the group (for odd_one_out)'),

  oddColor: BreakColorSchema
    .optional()
    .describe('Color of the single odd item when oddAttribute is color'),

  groupCount: z.number()
    .int()
    .min(2)
    .max(6)
    .optional()
    .describe('How many matching items surround the odd one (for odd_one_out)'),

  // Match two: the pair that looks the same
  matchShape: ShapeTypeSchema
    .optional()
    .describe('Shape of the matching pair (for match_two)'),

  matchColor: BreakColorSchema
    .optional()
    .describe('Color of the matching pair (for match_two)'),

  // Pattern completion: the last color is the answer, the rest are shown
  patternColors: z.array(BreakColorSchema)
    .min(3)
    .max(8)
    .optional()
    .describe(
      'Color sequence for pattern_completion. The last entry is the blank the child fills.',
    ),

  groupItem: BreakContentItemSchema.optional()
    .describe('The repeated item in odd_one_out'),
  oddItem: BreakContentItemSchema.optional()
    .describe('The one item that does not match the group'),
  matchItem: BreakContentItemSchema.optional()
    .describe('The pair that looks or sounds the same in match_two'),
  distractors: z.array(BreakContentItemSchema)
    .max(6)
    .optional()
    .describe('Items that are not the matching pair'),
}).refine(
  (data) => {
    // Validate variant-specific required fields
    switch (data.variant) {
      case 'tracing_lines':
        return data.linePattern !== undefined;
      case 'dot_tapping':
        return data.color !== undefined;
      case 'coloring':
        return data.coloringImage !== undefined &&
          data.availableColors !== undefined;
      case 'memory_game':
        return data.cardCount !== undefined || data.pairCount !== undefined;
      case 'tap_shapes':
        return data.targetShape !== undefined;
      case 'odd_one_out':
        return contentReady(data.groupItem) &&
          contentReady(data.oddItem) &&
          contentKey(data.groupItem) !== contentKey(data.oddItem);
      case 'attribute_tap':
        return data.targetShape !== undefined || data.color !== undefined;
      case 'match_two':
        return contentReady(data.matchItem) &&
          !!data.distractors &&
          data.distractors.length >= 2 &&
          data.distractors.every(contentReady) &&
          data.distractors.every((item) => contentKey(item) !== contentKey(data.matchItem!));
      case 'pattern_completion':
        return data.patternColors !== undefined && data.patternColors.length >= 3;
      default:
        return true;
    }
  },
  (data) => ({
    message: `Missing required fields for variant "${data.variant}"`,
    path: ['variant'],
  }),
);

/**
 * Complete Break Time Mini-Game activity schema
 */
export const BreakTimeMiniGameActivitySchema = BaseActivitySchema.extend({
  type: z.literal('break_time_minigame'),
  config: BreakTimeMiniGameConfigSchema,
});

// Type exports
export type BreakTimeMiniGameConfig = z.infer<
  typeof BreakTimeMiniGameConfigSchema
>;
export type BreakTimeMiniGameActivity = z.infer<
  typeof BreakTimeMiniGameActivitySchema
>;

// ============================================================================
// READ SCHEMA (CM-B7)
// ============================================================================

/**
 * Read (CM-B7): a break has no teaching content, so any non-empty stored
 * config reads (19 PROD rows have no `variant`, 6 use `linePattern` values
 * outside the enum, 32 lack their variant's settings; v1 defaults them).
 */
export const BreakTimeMiniGameReadSchema = makeReadSchema(
  (config) => config,
  z.object({ variant: z.string().optional() }).passthrough(),
);
