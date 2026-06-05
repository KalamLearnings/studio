/**
 * Utility functions for working with curriculum schemas
 */

import { z } from 'zod';
import type { ActivityType } from './base';

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
  data: unknown
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
  errorPrefix = 'Validation failed'
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
 */
export function isValidActivityType(type: string): type is ActivityType {
  const validTypes: ActivityType[] = [
    'show_letter_or_word',
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
  ];

  return validTypes.includes(type as ActivityType);
}

/**
 * Get activity category based on type
 *
 * Useful for UI grouping and filtering
 */
export function getActivityCategory(type: ActivityType): string {
  const categories: Record<ActivityType, string> = {
    show_letter_or_word: 'Introduction',
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
    tap_dot_position: 'Assessment',
    letter_rain: 'Game',
    memory_card_match: 'Game',
    audio_letter_match: 'Recognition',
    color_letter: 'Writing',
    letter_discrimination: 'Recognition',
    speech_practice: 'Recognition',
    activity_request: 'Other',
    // Themed activities
    grid_tap: 'Recognition',
    pick_from_tree: 'Game',
    pick_flowers: 'Game',
    tap_crescent_moons: 'Game',
    drag_to_animal_mouth: 'Game',
    feed_rabbit: 'Game',
    feed_baby: 'Game',
    piggy_bank: 'Game',
    snowflakes: 'Game',
    bear_honey: 'Game',
    fly_on_flowers: 'Game',
    deliver_envelope: 'Game',
    plant_seeds: 'Game',
    balance_scale: 'Game',
    ice_cream_stacking: 'Game',
    content_with_cards: 'Interactive',
    drag_hamza_to_letter: 'Writing',
    drag_haraka_to_letter: 'Writing',
    slingshot: 'Game',
    i_spy: 'Recognition',
    sound_blend: 'Phonics',
    match_pairs: 'Recognition',
    camel_narration: 'Introduction',
  };

  return categories[type];
}

/**
 * Get estimated duration for activity type (in seconds)
 *
 * These are defaults - actual activities may override
 */
export function getEstimatedDuration(type: ActivityType): number {
  const durations: Record<ActivityType, number> = {
    show_letter_or_word: 5,
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
    tap_dot_position: 20,
    letter_rain: 60,
    memory_card_match: 60,
    audio_letter_match: 45,
    color_letter: 60,
    letter_discrimination: 45,
    speech_practice: 45,
    activity_request: 0,
    // Themed activities
    grid_tap: 45,
    pick_from_tree: 45,
    pick_flowers: 45,
    tap_crescent_moons: 45,
    drag_to_animal_mouth: 45,
    feed_rabbit: 45,
    feed_baby: 45,
    piggy_bank: 45,
    snowflakes: 45,
    bear_honey: 45,
    fly_on_flowers: 45,
    deliver_envelope: 45,
    plant_seeds: 45,
    balance_scale: 45,
    ice_cream_stacking: 45,
    content_with_cards: 30,
    drag_hamza_to_letter: 45,
    drag_haraka_to_letter: 45,
    slingshot: 45,
    i_spy: 45,
    sound_blend: 45,
    match_pairs: 45,
    camel_narration: 30,
  };

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
    Object.entries(obj).filter(([_, value]) => value !== undefined && value !== null)
  ) as Partial<T>;
}

/**
 * Deep merge two objects
 *
 * Useful for merging config overrides with defaults
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
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
        output[key] = deepMerge(targetValue, sourceValue) as any;
      } else if (sourceValue !== undefined) {
        output[key] = sourceValue as any;
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
  const defaults: Record<ActivityType, Record<string, any>> = {
    show_letter_or_word: {
      contentType: 'letter',
      letter: 'ب',
      autoAdvance: false,
      displayDuration: 3000,
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
      letterForm: 'ب',
      position: 'isolated',
      traceCount: 1,
      maxAttempts: 5,
      recognitionTolerance: 0.7,
    },
    pop_balloons_with_letter: {
      correctLetter: 'ب',
      distractorLetters: ['ت', 'ث', 'ن'],
      duration: 60,
      targetCount: 10,
      balloonSpeed: 1.0,
      spawnRate: 1.5,
      correctRatio: 0.4,
    },
    break_time_minigame: {
      variant: 'tracing_lines',
      duration: 30,
    },
    multiple_choice_question: {
      question: { en: 'Select the correct letter', ar: 'اختر الحرف الصحيح' },
      options: [],
      correctOptionId: '',
      layout: 'vertical',
      showImages: false,
      randomizeOptions: false,
    },
    drag_items_to_target: {
      variant: 'letter_matching',
      draggableItems: [],
      correctCount: 1,
      snapToTarget: true,
    },
    catch_fish_with_letter: {
      targetLetter: 'ب',
      totalFish: 10,
      correctFishCount: 3,
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
      targetLetter: 'ب',
      position: 'isolated',
      distractorDotsCount: 0,
    },
    tap_dot_position: {
      targetLetter: 'ب',
      position: 'isolated',
      distractorPositions: [],
    },
    letter_rain: {
      targetLetter: 'ب',
      distractorLetters: ['ت', 'ث'],
      targetCount: 5,
      speed: 1.0,
      difficulty: 'medium',
    },
    memory_card_match: {
      pairs: [],
      gridSize: '4x4',
      theme: 'letters',
    },
    audio_letter_match: {
      targetLetter: 'ب',
      distractorLetters: ['ت', 'ث'],
      audioUrl: '',
    },
    color_letter: {
      letter: 'ب',
      palette: ['#FF0000', '#00FF00', '#0000FF'],
      brushSize: 10,
    },
    letter_discrimination: {
      targetLetter: 'ب',
      confusableLetters: ['ت', 'ث'],
      highlightDifference: false,
    },
    activity_request: {
      description: '',
      notes: '',
    },
    content_with_cards: {
      contentType: 'letter',
      content: { letter: 'ب' },
      cards: [
        { id: 'card_1', text: 'ب', isCorrect: true },
        { id: 'card_2', text: 'ت', isCorrect: false },
      ],
      cardMode: 'text',
      interactive: true,
    },
    i_spy: {
      targetLetter: 'ب',
      targetCount: 5,
      totalLetters: 12,
      letterSize: 'medium',
    },
    sound_blend: {
      word: 'جَمَل',
      segments: [
        { sound: 'جَ', duration: 1 },
        { sound: 'مَ', duration: 2 },
        { sound: 'ل', duration: 1 },
      ],
      speed: 'slow',
      requiredSlides: 2,
    },
    camel_narration: {
      narrationSteps: [],
      defaultPose: 'idle',
      showSubtitles: false,
      autoAdvance: true,
    },
    // New themed activities - most share target letter + distractors pattern
    speech_practice: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      showPhonetics: true,
      maxAttempts: 3,
    },
    grid_tap: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      gridSize: 4,
      targetCount: 3,
    },
    pick_from_tree: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    pick_flowers: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    tap_crescent_moons: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    drag_to_animal_mouth: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
      animalType: 'camel',
    },
    feed_rabbit: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    feed_baby: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    piggy_bank: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    snowflakes: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    bear_honey: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    fly_on_flowers: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    deliver_envelope: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    plant_seeds: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    balance_scale: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    ice_cream_stacking: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    drag_hamza_to_letter: {
      baseLetter: { letterId: 'alif', form: 'isolated' },
      hamzaPosition: 'above',
    },
    drag_haraka_to_letter: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      harakaType: 'fatha',
    },
    slingshot: {
      targetLetter: { letterId: 'ba', form: 'isolated' },
      distractorLetters: [],
      targetCount: 3,
    },
    match_pairs: {
      pairs: [],
      matchType: 'letter_to_letter',
    },
  };

  return defaults[type];
}

// ============================================================================
// LETTER REFERENCE HELPERS
// ============================================================================

import type { LetterReference, LetterPosition, OptionalHaraka } from './base';

/**
 * Type guard to check if a value is a LetterReference
 */
export function isLetterReference(value: unknown): value is LetterReference {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.letterId === 'string' &&
    typeof obj.form === 'string' &&
    ['isolated', 'initial', 'medial', 'final'].includes(obj.form as string)
  );
}

/**
 * Type guard to check if a value is an array of LetterReferences
 */
export function isLetterReferenceArray(value: unknown): value is LetterReference[] {
  return Array.isArray(value) && value.every(isLetterReference);
}

/**
 * Create a LetterReference object
 *
 * @example
 * ```typescript
 * createLetterReference('ba', 'isolated')
 * createLetterReference('ba', 'initial', 'fatha')
 * ```
 */
export function createLetterReference(
  letterId: string,
  form: LetterPosition,
  haraka?: OptionalHaraka
): LetterReference {
  const ref: LetterReference = { letterId, form };
  if (haraka && haraka !== 'none') {
    ref.haraka = haraka;
  }
  return ref;
}

/**
 * Normalize a value to LetterReference format
 *
 * Handles:
 * - Already a LetterReference → returns as-is
 * - String letter ID → creates LetterReference with default form
 *
 * @param value - String letter ID or LetterReference
 * @param defaultForm - Form to use when value is a string (default: 'isolated')
 */
export function normalizeToLetterReference(
  value: string | LetterReference,
  defaultForm: LetterPosition = 'isolated'
): LetterReference {
  if (isLetterReference(value)) {
    return value;
  }
  return createLetterReference(value, defaultForm);
}

/**
 * Compare two LetterReferences for equality
 *
 * Compares letterId, form, and haraka (if present)
 */
export function letterReferencesEqual(
  a: LetterReference | null | undefined,
  b: LetterReference | null | undefined
): boolean {
  if (!a || !b) return a === b;
  return (
    a.letterId === b.letterId &&
    a.form === b.form &&
    (a.haraka || 'none') === (b.haraka || 'none')
  );
}

/**
 * Get a unique key for a LetterReference (useful for React keys, Maps, etc.)
 */
export function getLetterReferenceKey(ref: LetterReference): string {
  return `${ref.letterId}:${ref.form}${ref.haraka ? `:${ref.haraka}` : ''}`;
}

/**
 * Parse a LetterReference key back to a LetterReference
 */
export function parseLetterReferenceKey(key: string): LetterReference | null {
  const parts = key.split(':');
  if (parts.length < 2) return null;

  const letterId = parts[0];
  const form = parts[1];
  const haraka = parts[2];

  if (!letterId || !form) return null;
  if (!['isolated', 'initial', 'medial', 'final'].includes(form)) return null;

  return {
    letterId,
    form: form as LetterPosition,
    ...(haraka ? { haraka: haraka as OptionalHaraka } : {}),
  };
}
