/**
 * Utility functions for working with curriculum schemas
 */

import { z } from 'zod';
import { type ActivityType, ActivityTypeSchema } from './base.ts';

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validation result with detailed error information
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Safely validate data against a Zod schema
 *
 * Returns a user-friendly result object instead of throwing
 *
 * @example
 * const result = safeValidate(TapLetterInWordConfigSchema, data);
 * if (result.success) {
 *   console.log('Valid:', result.data);
 * } else {
 *   console.error('Errors:', result.errors);
 * }
 */
export function safeValidate<T extends z.ZodType>(
  schema: T,
  data: unknown,
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}

/**
 * Validate and throw on error
 *
 * Useful when you want to fail fast in server-side code
 *
 * @throws {Error} If validation fails
 */
export function validateOrThrow<T extends z.ZodType>(
  schema: T,
  data: unknown,
  errorPrefix = 'Validation failed',
): z.infer<T> {
  const result = safeValidate(schema, data);

  if (!result.success) {
    const errorMessages = result.errors!
      .map((err) => `${err.field}: ${err.message}`)
      .join(', ');

    throw new Error(`${errorPrefix}: ${errorMessages}`);
  }

  return result.data!;
}

// ============================================================================
// ACTIVITY TYPE HELPERS
// ============================================================================

/**
 * Check if a string is a valid activity type
 * Uses ActivityTypeSchema as the single source of truth
 */
export function isValidActivityType(type: string): type is ActivityType {
  return ActivityTypeSchema.options.includes(type as ActivityType);
}

/**
 * Get activity category based on type
 *
 * Useful for UI grouping and filtering
 */
export function getActivityCategory(type: ActivityType): string {
  const categories = {
    show_letter_or_word: 'Introduction',
    animation_intro: 'Introduction',
    tap_letter_in_word: 'Recognition',
    trace_letter: 'Writing',
    pop_balloons_with_letter: 'Game',
    break_time_minigame: 'Break',
    multiple_choice_question: 'Assessment',
    drag_items_to_target: 'Interactive',
    catch_fish_with_letter: 'Game',
    add_pizza_toppings_with_letter: 'Game',
    build_word_from_letters: 'Interactive',
    drag_dots_to_letter: 'Interactive',
    tap_dot_position: 'Interactive',
    activity_request: 'Other',
    letter_rain: 'Game',
    memory_card_match: 'Game',
    audio_letter_match: 'Recognition',
    color_letter: 'Interactive',
    letter_discrimination: 'Recognition',
    speech_practice: 'Assessment',
    grid_tap: 'Game',
    pick_from_tree: 'Game',
    pick_flowers: 'Game',
    tap_crescent_moons: 'Game',
    drag_to_animal_mouth: 'Interactive',
    feed_rabbit: 'Game',
    feed_baby: 'Game',
    piggy_bank: 'Game',
    snowflakes: 'Game',
    bear_honey: 'Game',
    fly_on_flowers: 'Game',
    deliver_envelope: 'Game',
    plant_seeds: 'Game',
    balance_scale: 'Interactive',
    ice_cream_stacking: 'Game',
    content_with_cards: 'Interactive',
    read_and_match: 'Reading',
    sentence_builder: 'Reading',
    sound_sort: 'Listening',
  } as Record<ActivityType, string>;

  return categories[type];
}

/**
 * Get estimated duration for activity type (in seconds)
 *
 * These are defaults - actual activities may override
 */
export function getEstimatedDuration(type: ActivityType): number {
  const durations = {
    show_letter_or_word: 5,
    animation_intro: 15,
    tap_letter_in_word: 30,
    trace_letter: 60,
    pop_balloons_with_letter: 60,
    break_time_minigame: 30,
    multiple_choice_question: 20,
    drag_items_to_target: 45,
    catch_fish_with_letter: 60,
    add_pizza_toppings_with_letter: 45,
    build_word_from_letters: 90,
    drag_dots_to_letter: 45,
    tap_dot_position: 30,
    activity_request: 0,
    letter_rain: 60,
    memory_card_match: 120,
    audio_letter_match: 30,
    color_letter: 180,
    letter_discrimination: 20,
    speech_practice: 60,
    grid_tap: 45,
    pick_from_tree: 45,
    pick_flowers: 45,
    tap_crescent_moons: 45,
    drag_to_animal_mouth: 60,
    feed_rabbit: 45,
    feed_baby: 45,
    piggy_bank: 60,
    snowflakes: 60,
    bear_honey: 45,
    fly_on_flowers: 60,
    deliver_envelope: 60,
    plant_seeds: 60,
    balance_scale: 90,
    ice_cream_stacking: 60,
    content_with_cards: 120,
    read_and_match: 30,
    sentence_builder: 60,
    sound_sort: 60,
  } as Record<ActivityType, number>;

  return durations[type];
}

// ============================================================================
// DATA TRANSFORMATION HELPERS
// ============================================================================

/**
 * Strip undefined and null values from an object
 *
 * Useful before sending data to API or storing in database
 */
export function stripEmpty<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined && value !== null),
  ) as Partial<T>;
}

/**
 * Deep merge two objects
 *
 * Useful for merging config overrides with defaults
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = output[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        output[key] = deepMerge(targetValue, sourceValue) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        output[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return output;
}

/**
 * Create a default config object for an activity type
 *
 * Returns minimal valid configuration that passes schema validation
 */
export function createDefaultConfig(type: ActivityType): Record<string, any> {
  const defaults = {
    show_letter_or_word: {
      contentType: 'letter',
      targetLetter: { letterId: 'ba', form: 'isolated' },
      autoAdvance: false,
      displayDuration: 3000,
    },
    animation_intro: {
      animationUrl: '',
      loop: true,
    },
    tap_letter_in_word: {
      targetWord: 'باب',
      targetLetter: 'ب',
      targetCount: 2,
      showHighlight: true,
      highlightColor: '#4CAF50',
      provideFeedback: true,
    },
    trace_letter: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      traceCount: 1,
      maxAttempts: 5,
      recognitionTolerance: 0.7,
    },
    pop_balloons_with_letter: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }, {
        letterId: 'tha',
        form: 'isolated',
      }, { letterId: 'noon', form: 'isolated' }],
      duration: 60,
      targetCount: 10,
      balloonSpeed: 1.0,
    },
    break_time_minigame: {
      variant: 'tracing_lines',
      duration: 30,
    },
    multiple_choice_question: {
      prompt: { kind: 'sound_to_symbol' },
      options: [
        {
          id: 'option_0',
          kind: 'letter',
          letter: { letterId: 'ba', form: 'isolated' },
          isCorrect: true,
        },
        {
          id: 'option_1',
          kind: 'letter',
          letter: { letterId: 'ta', form: 'isolated' },
          isCorrect: false,
        },
      ],
      layout: 'vertical',
      randomizeOptions: false,
    },
    drag_items_to_target: {
      variant: 'letter_matching',
      draggableItems: [],
      correctCount: 1,
      snapToTarget: true,
    },
    catch_fish_with_letter: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }, {
        letterId: 'tha',
        form: 'isolated',
      }],
      targetCount: 3,
      duration: 60,
      fishSpeed: 1.0,
    },
    add_pizza_toppings_with_letter: {
      targetLetter: 'ب',
      toppings: [],
      requiredToppingsCount: 3,
    },
    build_word_from_letters: {
      targetWord: 'باب',
      showConnectedForm: true,
      highlightCorrectPositions: true,
      scrambleLetters: true,
      showWordMeaning: false,
    },
    drag_dots_to_letter: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
    },
    tap_dot_position: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorPositions: ['top'],
    },
    activity_request: {},
    letter_rain: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }, {
        letterId: 'tha',
        form: 'isolated',
      }],
      targetCount: 5,
      speed: 1.0,
      difficulty: 'medium',
    },
    memory_card_match: {
      letters: [
        { letterId: 'ba', form: 'isolated', matchingForm: 'initial' },
        { letterId: 'ta', form: 'isolated', matchingForm: 'initial' },
      ],
      cardCount: 4,
      matchType: 'letter_to_letter',
      showHints: false,
    },
    audio_letter_match: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }, {
        letterId: 'tha',
        form: 'isolated',
      }],
      playAudioOnStart: true,
    },
    color_letter: {
      letter: { letterId: 'ba', form: 'isolated' },
      strokeWidth: 10,
      allowEraser: true,
      saveDrawing: false,
    },
    letter_discrimination: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
    },
    speech_practice: {
      contentType: 'letter',
      targetLetter: { letterId: 'ba', form: 'isolated' },
    },
    grid_tap: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    pick_from_tree: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    pick_flowers: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    tap_crescent_moons: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    drag_to_animal_mouth: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    feed_rabbit: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    feed_baby: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    piggy_bank: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    snowflakes: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    bear_honey: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    fly_on_flowers: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    deliver_envelope: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    plant_seeds: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    balance_scale: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    ice_cream_stacking: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
    },
    content_with_cards: {
      cards: [{ id: 'card_0', kind: 'letter', letter: { letterId: 'ba', form: 'isolated' } }],
      targetLetter: { letterId: 'ba', form: 'isolated' },
      interactive: false,
    },
    drag_hamza_to_letter: {
      targetLetter: { letterId: 'alif', form: 'isolated' },
      correctPosition: 'above',
    },
    drag_haraka_to_letter: {
      harakaType: 'fatha',
      targetLetter: { letterId: 'ba', form: 'isolated' },
    },
    drag_haraka_to_word: {
      word: { text: 'مَرْيَم' },
      blankIndices: [0],
      distractorHarakat: [],
    },
    slingshot: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }],
      targetCount: 5,
      difficulty: 'medium',
    },
    i_spy: {
      targetLetter: [{ letterId: 'ba', form: 'isolated' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated' }, {
        letterId: 'tha',
        form: 'isolated',
      }, { letterId: 'noon', form: 'isolated' }],
      targetCount: 5,
      totalLetters: 12,
      letterSize: 'medium',
    },
    drive_to_sukoon: {
      word: { text: 'مَرْيَم' },
      showStopSign: true,
    },
    drive_to_shadda: {
      word: { text: 'مُحَمَّد' },
      holdMs: 1000,
    },
    sound_blend: {
      word: 'جَمَل',
      segments: [
        { sound: 'جَ', duration: 2 },
        { sound: 'مَ', duration: 2 },
        { sound: 'ل', duration: 1 },
      ],
      speed: 'segmented',
      requiredSlides: 1,
    },
    word_split_blend: {
      word: '',
      chunks: [{ text: '' }, { text: '' }, { text: '' }],
    },
    match_pairs: {
      pairs: [
        {
          left: { kind: 'letter', letter: { letterId: 'ba', form: 'isolated' } },
          right: { kind: 'letter', letter: { letterId: 'ba', form: 'medial' } },
        },
        {
          left: { kind: 'letter', letter: { letterId: 'ta', form: 'isolated' } },
          right: { kind: 'letter', letter: { letterId: 'ta', form: 'medial' } },
        },
      ],
      shuffleItems: true,
    },
    camel_narration: {
      narrationSteps: [],
    },
    // Reading types (CM-B35): the author picks the reviewed words, pictures and sounds.
    read_and_match: {
      sentence: { kind: 'phrase', phrase: { wordIds: [], isSentence: true } },
      options: [],
    },
    sentence_builder: {
      sentence: { kind: 'phrase', phrase: { wordIds: [], isSentence: true } },
    },
    sound_sort: {
      sortBy: 'first_sound',
      bins: [],
      items: [],
      playItemAudio: true,
    },
  } as Record<ActivityType, Record<string, any>>;

  return defaults[type];
}
