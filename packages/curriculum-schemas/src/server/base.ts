/**
 * Base schemas and types used across all curriculum activities
 *
 * These foundational schemas are used as building blocks for
 * activity-specific configurations.
 */

import { z } from 'zod';
import {
  HARAKA_CHARS,
  HARAKA_IDS,
  HARAKA_META,
  type HarakaType,
  type OptionalHaraka,
} from './harakat.ts';
import { isValidMadd, MADD_NEEDS_SHORT_VOWEL } from './madd.ts';

// ============================================================================
// LOCALIZED TEXT
// ============================================================================

/**
 * Localized text for bilingual content (English & Arabic)
 *
 * English text is required, Arabic text is optional.
 * This allows for gradual content development and optional Arabic translations.
 */
export const LocalizedTextSchema = z.object({
  en: z.string()
    .min(1, 'English text required')
    .describe('English text'),

  ar: z.string()
    .optional()
    .describe('Arabic text (RTL) - optional'),

  audio_url: z.string()
    .optional()
    .refine(
      (val) =>
        !val || val.startsWith('http') || val.startsWith('instructions/') ||
        val.startsWith('conditional/'),
      { message: 'Must be a valid URL or relative storage path' },
    )
    .describe('URL or relative path to audio file'),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

/**
 * Instruction text — like LocalizedText but the English text is OPTIONAL.
 *
 * Not every activity needs a spoken/visible instruction. Requiring `en`
 * previously forced curriculum creators to type placeholder text just to save
 * the activity. When `en` is present, instruction audio can be auto-generated.
 */
export const InstructionSchema = z.object({
  en: z.string()
    .optional()
    .describe('English instruction text (optional)'),

  audio_url: z.string()
    .optional()
    .refine(
      (val) =>
        !val || val.startsWith('http') || val.startsWith('instructions/') ||
        val.startsWith('conditional/'),
      { message: 'Must be a valid URL or relative storage path' },
    )
    .describe('URL or relative path to instruction audio file'),

  voiceId: z.string()
    .optional()
    .describe(
      'TTS voice (ElevenLabs voice id) used to synthesize the instruction audio. ' +
        'Client intent; the backend reads it when generating audio.',
    ),
});

export type Instruction = z.infer<typeof InstructionSchema>;

// ============================================================================
// ACTIVITY TYPE ENUM
// ============================================================================

/**
 * Complete list of activity types in the curriculum system
 *
 * This is the single source of truth for valid activity types.
 * Each type has a corresponding schema in the activities/ directory.
 */
export const ActivityTypeSchema = z.enum([
  'show_letter_or_word',
  'animation_intro',
  'tap_letter_in_word',
  'trace_letter',
  'pop_balloons_with_letter',
  'break_time_minigame',
  'multiple_choice_question',
  'drag_items_to_target',
  'catch_fish_with_letter',
  'add_pizza_toppings_with_letter',
  'build_word_from_letters',
  'drag_dots_to_letter',
  'tap_dot_position',
  'activity_request',
  'letter_rain',
  'memory_card_match',
  'audio_letter_match',
  'color_letter',
  'letter_discrimination',
  'speech_practice',
  // New themed activities
  'grid_tap',
  'pick_from_tree',
  'pick_flowers',
  'tap_crescent_moons',
  'drag_to_animal_mouth',
  'feed_rabbit',
  'feed_baby',
  'piggy_bank',
  'snowflakes',
  'bear_honey',
  'fly_on_flowers',
  'deliver_envelope',
  'plant_seeds',
  'balance_scale',
  'ice_cream_stacking',
  'content_with_cards',
  'drag_hamza_to_letter',
  'drag_haraka_to_letter',
  'drag_haraka_to_word',
  'slingshot',
  'i_spy',
  'sound_blend',
  'word_split_blend',
  'drive_to_sukoon',
  'drive_to_shadda',
  'stretch_madd',
  'match_pairs',
  'camel_narration',
  // Reading beyond the word (CM-B35, ADR 0002); v2 only (`visibility.ts`)
  'read_and_match',
  'sentence_builder',
  'sound_sort',
]);

export type ActivityType = z.infer<typeof ActivityTypeSchema>;

/**
 * Human-readable labels for activity types
 * Used in UI dropdowns and displays
 */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  show_letter_or_word: 'Show Single Letter or Word',
  animation_intro: 'Animation Intro',
  tap_letter_in_word: 'Tap Target Letters in Word',
  trace_letter: 'Letter Tracing',
  pop_balloons_with_letter: 'Pop Balloons with Target Letter',
  break_time_minigame: 'Break Time Mini-Game',
  multiple_choice_question: 'Multiple Choice Question',
  drag_items_to_target: 'Drag Items to Correct Targets',
  catch_fish_with_letter: 'Catch Fish with Target Letter',
  add_pizza_toppings_with_letter: 'Add Pizza Toppings with Letter',
  build_word_from_letters: 'Build Word from Letters',
  drag_dots_to_letter: 'Drag Dots to Letter',
  tap_dot_position: 'Tap Correct Dot Position',
  activity_request: 'Activity Request (Not Implemented)',
  letter_rain: 'Letter Rain (Physics)',
  memory_card_match: 'Memory Card Match',
  audio_letter_match: 'Audio Letter Matching',
  color_letter: 'Letter Coloring',
  letter_discrimination: 'Similar Letter Discrimination',
  speech_practice: 'Speech Pronunciation Practice',
  // New themed activities
  grid_tap: 'Grid Tap (Select Letters)',
  pick_from_tree: 'Pick Fruit from Tree',
  pick_flowers: 'Pick Flowers in Field',
  tap_crescent_moons: 'Tap Crescent Moons',
  drag_to_animal_mouth: 'Drag to Animal Mouth',
  feed_rabbit: 'Feed the Rabbit',
  feed_baby: 'Feed the Baby',
  piggy_bank: 'Piggy Bank Coins',
  snowflakes: 'Catch Snowflakes',
  bear_honey: 'Bear Honey Collection',
  fly_on_flowers: 'Fly on Flowers',
  deliver_envelope: 'Deliver Envelope',
  plant_seeds: 'Plant Seeds',
  balance_scale: 'Balance Scale',
  ice_cream_stacking: 'Ice Cream Stacking',
  content_with_cards: 'Content with Cards',
  drag_hamza_to_letter: 'Drag Hamza to Letter',
  drag_haraka_to_letter: 'Drag Haraka to Letter',
  drag_haraka_to_word: 'Drag Haraka to Word',
  slingshot: 'Slingshot Game',
  i_spy: 'I Spy (Find Letters)',
  sound_blend: 'Sound Blending',
  word_split_blend: 'Word Split & Blend',
  drive_to_sukoon: 'Drive to Sukoon',
  drive_to_shadda: 'Shadda Racetrack',
  stretch_madd: 'Stretch the Madd',
  match_pairs: 'Match Pairs (Draw Lines)',
  camel_narration: 'Camel Mascot Narration',
  read_and_match: 'Read and Match (Phrase or Sentence)',
  sentence_builder: 'Sentence Builder (Word Order)',
  sound_sort: 'Sound Sort (Baskets)',
};

// ============================================================================
// BASE ACTIVITY SCHEMA
// ============================================================================

/**
 * Base activity schema - all activities extend this
 *
 * Contains common fields present in every activity regardless of type.
 * Activity-specific fields go in the 'config' object.
 */
export const BaseActivitySchema = z.object({
  id: z.string()
    .uuid()
    .describe('Unique identifier for this activity'),

  type: ActivityTypeSchema
    .describe('Activity type - determines which config schema to use'),

  node_id: z.string()
    .uuid()
    .describe('Parent node/lesson this activity belongs to'),

  sequence_number: z.number()
    .int()
    .positive()
    .describe('Order within the node (1, 2, 3...)'),

  instruction: InstructionSchema
    .describe('Instructions shown to the student (optional text)'),

  created_at: z.string()
    .datetime()
    .describe('When this activity was created'),

  updated_at: z.string()
    .datetime()
    .describe('Last update timestamp'),
});

export type BaseActivity = z.infer<typeof BaseActivitySchema>;

// ============================================================================
// COMMON HELPER SCHEMAS
// ============================================================================

/**
 * Color hex string validation
 */
export const ColorSchema = z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)')
  .describe('Hex color code');

/**
 * Duration in milliseconds
 */
export const DurationMsSchema = z.number()
  .int()
  .positive()
  .describe('Duration in milliseconds');

/**
 * Duration in seconds
 */
export const DurationSecondsSchema = z.number()
  .int()
  .positive()
  .describe('Duration in seconds');

/**
 * Ratio/percentage as decimal (0-1)
 */
export const RatioSchema = z.number()
  .min(0)
  .max(1)
  .describe('Ratio as decimal (0.0 to 1.0)');

/**
 * Positive multiplier
 */
export const MultiplierSchema = z.number()
  .positive()
  .describe('Multiplier value (e.g., 1.0 = normal, 2.0 = double)');

/**
 * Single Arabic letter
 */
export const ArabicLetterSchema = z.string()
  .length(1)
  .regex(/[\u0600-\u06FF]/, 'Must be an Arabic letter')
  .describe('Single Arabic letter character');

/**
 * Arabic word or text
 */
export const ArabicTextSchema = z.string()
  .min(1)
  .regex(/[\u0600-\u06FF]/, 'Must contain Arabic characters')
  .describe('Arabic text (word, phrase, or sentence)');

/**
 * Letter position in word
 */
export const LetterPositionSchema = z.enum([
  'isolated',
  'initial',
  'medial',
  'final',
])
  .describe('Position of letter in word (affects letter form in Arabic)');

export type LetterPosition = z.infer<typeof LetterPositionSchema>;

/**
 * Difficulty level
 */
export const DifficultySchema = z.enum(['easy', 'medium', 'hard'])
  .describe('Difficulty level of the activity');

export type Difficulty = z.infer<typeof DifficultySchema>;

/**
 * Letter positions array for activities that support multiple letter forms
 */
export const LetterPositionsSchema = z.array(LetterPositionSchema)
  .min(1, 'At least one letter position required')
  .describe('Array of letter positions to include in the activity');

export type LetterPositions = z.infer<typeof LetterPositionsSchema>;

/**
 * Hamza position on a letter (for drag_hamza_to_letter activity)
 */
export const HamzaPositionSchema = z.enum(['above', 'below', 'on_line'])
  .describe('Position where hamza should be placed on the letter');

export type HamzaPosition = z.infer<typeof HamzaPositionSchema>;

/**
 * Arabic diacritical marks (harakat). The id list, characters and display
 * metadata live in harakat.ts; this is the Zod view of them.
 */
export const HarakaTypeSchema = z.enum(HARAKA_IDS)
  .describe('Arabic diacritic mark id (see HARAKA_META)');

export type { HarakaType, OptionalHaraka };
export { HARAKA_CHARS, HARAKA_META };

/**
 * HarakaType plus 'none' for optional diacritics
 */
export const OptionalHarakaSchema = z.enum(['none', ...HARAKA_IDS])
  .describe('Optional diacritic mark (none = no diacritic)');

// ============================================================================
// LETTER REFERENCE (Unified letter identification system)
// ============================================================================

/**
 * Letter identifier - the canonical name of an Arabic letter
 * Used to reference letters independent of their visual form
 *
 * Examples: 'alif', 'ba', 'ta', 'tha', 'jeem', 'ha', 'kha', etc.
 */
export const LetterIdSchema = z.string()
  .min(1)
  .max(20)
  .regex(/^[a-z_]+$/, 'Letter ID must be lowercase letters and underscores')
  .describe('Letter identifier (e.g., "ba", "alif", "jeem")');

export type LetterId = z.infer<typeof LetterIdSchema>;

/**
 * LetterReference - the unified way to identify an Arabic letter with its form
 *
 * References letters by ID (not Arabic character) for database independence,
 * form-specific rendering (isolated, initial, medial, final), an optional
 * diacritic and an optional madd (D7, CM-B4; rules in madd.ts).
 *
 * `madd: true` is valid only with haraka fatha, damma or kasra; absent means
 * false.
 *
 * @example
 * ```
 * { letterId: 'ba', form: 'isolated' }
 * { letterId: 'ba', form: 'initial', haraka: 'shadda_fatha' }
 * { letterId: 'ba', form: 'isolated', haraka: 'fatha', madd: true } // بَا
 * ```
 */
export const LetterReferenceSchema = z.object({
  letterId: LetterIdSchema
    .describe('Letter identifier from the letters table'),

  form: LetterPositionSchema
    .describe('Visual form of the letter'),

  haraka: OptionalHarakaSchema
    .optional()
    .describe('Optional diacritic mark to display on the letter'),

  madd: z.boolean()
    .optional()
    .describe('Long vowel after fatha, damma or kasra (absent = false)'),
}).superRefine((ref, ctx) => {
  if (!isValidMadd(ref)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['madd'], message: MADD_NEEDS_SHORT_VOWEL });
  }
});

export type LetterReference = z.infer<typeof LetterReferenceSchema>;

/**
 * Array of LetterReferences for multi-select scenarios
 */
export const LetterReferenceArraySchema = z.array(LetterReferenceSchema)
  .describe('Array of letter references');

export type LetterReferenceArray = z.infer<typeof LetterReferenceArraySchema>;

/**
 * Shape types for break time shape activities
 */
export const ShapeTypeSchema = z.enum([
  'circle',
  'square',
  'triangle',
  'star',
  'rectangle',
  'diamond',
  'oval',
  'heart',
])
  .describe('Type of shape for shape-based activities');

export type ShapeType = z.infer<typeof ShapeTypeSchema>;
