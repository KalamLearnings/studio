/**
 * Base schemas and types used across all curriculum activities
 *
 * These foundational schemas are used as building blocks for
 * activity-specific configurations.
 */

import { z } from 'zod';

// ============================================================================
// LOCALIZED TEXT
// ============================================================================

/**
 * Localized text for bilingual content (English & Arabic)
 *
 * English text is required, Arabic text is optional.
 * This allows for gradual content development and optional Arabic translations.
 * Audio URL is optional and can be generated via TTS.
 */
export const LocalizedTextSchema = z.object({
  en: z.string()
    .min(1, 'English text required')
    .describe('English text'),

  ar: z.string()
    .optional()
    .describe('Arabic text (RTL) - optional'),

  audio_url: z.string()
    .url()
    .optional()
    .describe('URL to audio file (TTS-generated or uploaded)'),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

// ============================================================================
// CONDITIONAL AUDIO SYSTEM
// ============================================================================

/**
 * Follow-up action types after audio plays
 */
export const FollowUpActionSchema = z.enum(['continue', 'retry', 'show_hint', 'none'])
  .describe('Action to take after audio completes');

export type FollowUpAction = z.infer<typeof FollowUpActionSchema>;

/**
 * Follow-up configuration after audio plays
 */
export const AudioFollowUpSchema = z.object({
  highlight: z.array(z.string())
    .max(10)
    .optional()
    .describe('Element IDs to highlight after audio (e.g., ["letter_0", "letter_2"])'),

  action: FollowUpActionSchema
    .default('none')
    .describe('Action to take after audio completes'),

  delay: z.number()
    .int()
    .min(0)
    .max(5000)
    .default(0)
    .describe('Delay in milliseconds before follow-up action'),
});

export type AudioFollowUp = z.infer<typeof AudioFollowUpSchema>;

/**
 * Audio response with text, URL, and optional follow-up actions
 *
 * Used for both predefined slots and custom rules.
 */
export const AudioResponseSchema = z.object({
  text: z.string()
    .min(1, 'Audio text is required')
    .max(500, 'Audio text must be under 500 characters')
    .describe('Text for TTS generation'),

  audio_url: z.string()
    .url()
    .optional()
    .describe('Generated audio URL (populated after TTS generation)'),

  voice_id: z.string()
    .optional()
    .describe('ElevenLabs voice ID used for generation'),

  followUp: AudioFollowUpSchema
    .optional()
    .describe('Actions to perform after audio finishes playing'),
});

export type AudioResponse = z.infer<typeof AudioResponseSchema>;

/**
 * Event types that can trigger conditional audio
 */
export const AudioTriggerEventSchema = z.enum(['tap', 'drag', 'drop', 'complete', 'timeout', 'submit'])
  .describe('User interaction event type');

export type AudioTriggerEvent = z.infer<typeof AudioTriggerEventSchema>;

/**
 * Comparison operators for condition matching
 */
export const AudioConditionOperatorSchema = z.enum(['equals', 'not_equals', 'contains'])
  .describe('Comparison operator for condition matching');

export type AudioConditionOperator = z.infer<typeof AudioConditionOperatorSchema>;

/**
 * Target element condition for audio rules
 */
export const AudioConditionTargetSchema = z.object({
  property: z.string()
    .min(1)
    .max(50)
    .describe('Property to check (e.g., "letterForm", "isCorrect", "elementId")'),

  value: z.string()
    .max(100)
    .describe('Expected value (e.g., "medial", "true", "letter_2")'),

  operator: AudioConditionOperatorSchema
    .default('equals')
    .describe('Comparison operator'),
});

export type AudioConditionTarget = z.infer<typeof AudioConditionTargetSchema>;

/**
 * Condition that determines when an audio rule triggers
 *
 * Conditions can match on:
 * - Event type (tap, drag, complete, etc.)
 * - Element properties (letterForm, isCorrect, etc.)
 * - Attempt number
 */
export const AudioConditionSchema = z.object({
  event: AudioTriggerEventSchema
    .describe('User interaction event that triggers this condition'),

  target: AudioConditionTargetSchema
    .optional()
    .describe('Element-specific condition (property/value match)'),

  attemptNumber: z.number()
    .int()
    .positive()
    .max(10)
    .optional()
    .describe('Trigger only on specific attempt number'),

  isFirstAttempt: z.boolean()
    .optional()
    .describe('Trigger only on first attempt'),
});

export type AudioCondition = z.infer<typeof AudioConditionSchema>;

/**
 * Custom audio rule for activity-specific scenarios
 *
 * Rules are evaluated in priority order (highest first).
 * Once a rule matches and plays, it won't play again.
 */
export const AudioRuleSchema = z.object({
  id: z.string()
    .uuid()
    .describe('Unique identifier for this rule'),

  name: z.string()
    .min(1)
    .max(50)
    .describe('Human-readable name for dashboard display'),

  condition: AudioConditionSchema
    .describe('When this rule should trigger'),

  response: AudioResponseSchema
    .describe('Audio to play and follow-up actions'),

  priority: z.number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe('Evaluation priority (higher = evaluated first, 1-100)'),

  enabled: z.boolean()
    .default(true)
    .describe('Whether this rule is active'),
});

export type AudioRule = z.infer<typeof AudioRuleSchema>;

/**
 * Complete conditional audio configuration for an activity
 *
 * Combines predefined slots (covering 80% of use cases) with
 * custom rules for complex activity-specific scenarios.
 *
 * Evaluation order:
 * 1. Custom rules (sorted by priority, highest first)
 * 2. Predefined slots (based on event type and success state)
 */
export const ConditionalAudioConfigSchema = z.object({
  // ========== PREDEFINED SLOTS (common feedback patterns) ==========

  onSuccess: AudioResponseSchema
    .optional()
    .describe('Plays when activity completed successfully'),

  onPartialSuccess: AudioResponseSchema
    .optional()
    .describe('Plays when partially correct (e.g., found 1 of 2 targets)'),

  onFirstWrongAttempt: AudioResponseSchema
    .optional()
    .describe('Encouragement on first wrong attempt'),

  onSecondWrongAttempt: AudioResponseSchema
    .optional()
    .describe('Hint on second wrong attempt'),

  onThirdWrongAttempt: AudioResponseSchema
    .optional()
    .describe('More explicit guidance on third wrong attempt'),

  onCompletion: AudioResponseSchema
    .optional()
    .describe('Plays when activity ends (regardless of success)'),

  // ========== CUSTOM RULES (activity-specific scenarios) ==========

  rules: z.array(AudioRuleSchema)
    .max(10)
    .optional()
    .describe('Custom audio rules for complex scenarios (max 10)'),
});

export type ConditionalAudioConfig = z.infer<typeof ConditionalAudioConfigSchema>;

/**
 * Extended LocalizedText with conditional audio support
 *
 * This extends the base LocalizedText to include conditional audio
 * configuration for activities that need dynamic audio responses.
 */
export const LocalizedTextWithConditionalAudioSchema = LocalizedTextSchema.extend({
  conditionalAudio: ConditionalAudioConfigSchema
    .optional()
    .describe('Conditional audio responses based on user interactions'),
});

export type LocalizedTextWithConditionalAudio = z.infer<typeof LocalizedTextWithConditionalAudioSchema>;

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
  // Themed activities
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
  'slingshot',
  'i_spy',
  'sound_blend',
  'match_pairs',
  'camel_narration',
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
  // Themed activities
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
  slingshot: 'Slingshot Game',
  i_spy: 'I Spy (Find Letters)',
  sound_blend: 'Sound Blending',
  match_pairs: 'Match Pairs (Draw Lines)',
  camel_narration: 'Camel Mascot Narration',
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

  instruction: LocalizedTextSchema
    .describe('Instructions shown to the student'),

  created_at: z.string()
    .datetime()
    .describe('When this activity was created'),

  updated_at: z.string()
    .datetime()
    .describe('Last update timestamp'),
});

export type BaseActivity = z.infer<typeof BaseActivitySchema>;

/**
 * Base activity config schema
 * Can be extended by specific activity configs
 */
export const BaseActivityConfigSchema = z.object({});
export type BaseActivityConfig = z.infer<typeof BaseActivityConfigSchema>;

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
export const LetterPositionSchema = z.enum(['isolated', 'initial', 'medial', 'final'])
  .describe('Position of letter in word (affects letter form in Arabic)');

export type LetterPosition = z.infer<typeof LetterPositionSchema>;

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
 * Arabic diacritical marks (harakat) for drag_haraka_to_letter activity
 */
export const HarakaTypeSchema = z.enum([
  'fatha',
  'damma',
  'kasra',
  'sukoon',
  'shadda',
]).describe('Arabic diacritic mark to drag onto a letter');

export type HarakaType = z.infer<typeof HarakaTypeSchema>;

/**
 * Unicode characters for harakat
 */
export const HARAKA_CHARS: Record<HarakaType, string> = {
  fatha: 'َ',
  damma: 'ُ',
  kasra: 'ِ',
  sukoon: 'ْ',
  shadda: 'ّ',
};

/**
 * Haraka metadata for UI display
 */
export const HARAKA_META: Record<HarakaType, {
  char: string;
  label: string;
  arabic: string;
  position: 'above' | 'below';
}> = {
  fatha: { char: 'َ', label: 'Fatha', arabic: 'فَتْحَة', position: 'above' },
  damma: { char: 'ُ', label: 'Damma', arabic: 'ضَمَّة', position: 'above' },
  kasra: { char: 'ِ', label: 'Kasra', arabic: 'كَسْرَة', position: 'below' },
  sukoon: { char: 'ْ', label: 'Sukoon', arabic: 'سُكُون', position: 'above' },
  shadda: { char: 'ّ', label: 'Shadda', arabic: 'شَدَّة', position: 'above' },
};

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
 * Extended HarakaType that includes 'none' for optional diacritics
 */
export const OptionalHarakaSchema = z.enum([
  'none',
  'fatha',
  'damma',
  'kasra',
  'sukoon',
  'shadda',
]).describe('Optional diacritic mark (none = no diacritic)');

export type OptionalHaraka = z.infer<typeof OptionalHarakaSchema>;

/**
 * LetterReference - the unified way to identify an Arabic letter with its form
 *
 * This is the canonical representation used across all activity configurations.
 * It references letters by ID (not Arabic character) for:
 * - Database independence (letters table can change)
 * - Form-specific rendering (isolated, initial, medial, final)
 * - Optional diacritics (haraka)
 *
 * @example
 * ```
 * { letterId: 'ba', form: 'isolated' }
 * { letterId: 'ba', form: 'initial', haraka: 'fatha' }
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
]).describe('Type of shape for shape-based activities');

export type ShapeType = z.infer<typeof ShapeTypeSchema>;

/**
 * Difficulty level
 */
export const DifficultySchema = z.enum(['easy', 'medium', 'hard'])
  .describe('Difficulty level of the activity');

export type Difficulty = z.infer<typeof DifficultySchema>;
