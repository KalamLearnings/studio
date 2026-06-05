/**
 * Activity schemas - centralized exports
 *
 * This file exports all activity schemas and creates a discriminated union
 * for type-safe activity handling.
 */

import { z } from 'zod';

// Export all individual activity schemas and types
export * from './show_letter_or_word';
export * from './LetterRainConfig';
export * from './audio_letter_match';
export * from './memory_card_match';
export * from './color_letter';
export * from './letter_discrimination';
export * from './tap_letter_in_word';
export * from './trace_letter';
export * from './pop_balloons_with_letter';
export * from './break_time_minigame';
export * from './build_word_from_letters';
export * from './multiple_choice_question';
export * from './drag_items_to_target';
export * from './catch_fish_with_letter';
export * from './add_pizza_toppings_with_letter';

// Export with specific exports to avoid SUPPORTED_DOTTED_LETTERS conflict
export {
  DragDotsToLetterConfigSchema,
  DragDotsToLetterActivitySchema,
  type DragDotsToLetterConfig,
  type DragDotsToLetterActivity,
} from './drag_dots_to_letter';

export {
  TapDotPositionConfigSchema,
  TapDotPositionActivitySchema,
  DOT_POSITIONS,
  type DotPosition,
  type TapDotPositionConfig,
  type TapDotPositionActivity,
  SUPPORTED_DOTTED_LETTERS,
} from './tap_dot_position';

export * from './activity_request';
export * from './content_with_cards';
export * from './i_spy';
export * from './sound_blend';
export * from './camel_narration';

// Import schemas for discriminated union
import { ShowLetterOrWordActivitySchema } from './show_letter_or_word';
import { LetterRainActivitySchema } from './LetterRainConfig';
import { AudioLetterMatchActivitySchema } from './audio_letter_match';
import { MemoryCardMatchActivitySchema } from './memory_card_match';
import { ColorLetterActivitySchema } from './color_letter';
import { LetterDiscriminationActivitySchema } from './letter_discrimination';
import { TapLetterInWordActivitySchema } from './tap_letter_in_word';
import { TraceLetterActivitySchema } from './trace_letter';
import { PopBalloonsWithLetterActivitySchema } from './pop_balloons_with_letter';
import { BreakTimeMiniGameActivitySchema } from './break_time_minigame';
import { BuildWordFromLettersActivitySchema } from './build_word_from_letters';
import { MultipleChoiceQuestionActivitySchema } from './multiple_choice_question';
import { DragItemsToTargetActivitySchema } from './drag_items_to_target';
import { CatchFishWithLetterActivitySchema } from './catch_fish_with_letter';
import { AddPizzaToppingsWithLetterActivitySchema } from './add_pizza_toppings_with_letter';
import { DragDotsToLetterActivitySchema } from './drag_dots_to_letter';
import { TapDotPositionActivitySchema } from './tap_dot_position';
import { ActivityRequestActivitySchema } from './activity_request';
import { ContentWithCardsActivitySchema } from './content_with_cards';
import { ISpyActivitySchema } from './i_spy';
import { SoundBlendActivitySchema } from './sound_blend';
import { CamelNarrationActivitySchema } from './camel_narration';

// Import config schemas for helper function
import { ShowLetterOrWordConfigSchema } from './show_letter_or_word';
import { LetterRainConfigSchema } from './LetterRainConfig';
import { AudioLetterMatchConfigSchema } from './audio_letter_match';
import { MemoryCardMatchConfigSchema } from './memory_card_match';
import { ColorLetterConfigSchema } from './color_letter';
import { LetterDiscriminationConfigSchema } from './letter_discrimination';
import { TapLetterInWordConfigSchema } from './tap_letter_in_word';
import { TraceLetterConfigSchema } from './trace_letter';
import { PopBalloonsWithLetterConfigSchema } from './pop_balloons_with_letter';
import { BreakTimeMiniGameConfigSchema } from './break_time_minigame';
import { BuildWordFromLettersConfigSchema } from './build_word_from_letters';
import { MultipleChoiceQuestionConfigSchema } from './multiple_choice_question';
import { DragItemsToTargetConfigSchema } from './drag_items_to_target';
import { CatchFishWithLetterConfigSchema } from './catch_fish_with_letter';
import { AddPizzaToppingsWithLetterConfigSchema } from './add_pizza_toppings_with_letter';
import { DragDotsToLetterConfigSchema } from './drag_dots_to_letter';
import { TapDotPositionConfigSchema } from './tap_dot_position';
import { ActivityRequestConfigSchema } from './activity_request';
import { ContentWithCardsConfigSchema } from './content_with_cards';
import { ISpyConfigSchema } from './i_spy';
import { SoundBlendConfigSchema } from './sound_blend';
import { CamelNarrationConfigSchema } from './camel_narration';

import type { ActivityType } from '../base';

/**
 * Discriminated union of all activity schemas
 *
 * This allows TypeScript to narrow types based on the 'type' field.
 *
 * @example
 * ```typescript
 * const activity: Activity = {...};
 * if (activity.type === 'tap_letter_in_word') {
 *   // TypeScript knows activity is TapLetterInWordActivity
 *   console.log(activity.config.targetWord);
 * }
 * ```
 */
export const ActivitySchema = z.discriminatedUnion('type', [
  ShowLetterOrWordActivitySchema,
  TapLetterInWordActivitySchema,
  TraceLetterActivitySchema,
  PopBalloonsWithLetterActivitySchema,
  BreakTimeMiniGameActivitySchema,
  BuildWordFromLettersActivitySchema,
  MultipleChoiceQuestionActivitySchema,
  DragItemsToTargetActivitySchema,
  CatchFishWithLetterActivitySchema,
  AddPizzaToppingsWithLetterActivitySchema,
  DragDotsToLetterActivitySchema,
  TapDotPositionActivitySchema,
  ActivityRequestActivitySchema,
  LetterRainActivitySchema,
  AudioLetterMatchActivitySchema,
  MemoryCardMatchActivitySchema,
  ColorLetterActivitySchema,
  LetterDiscriminationActivitySchema,
  ContentWithCardsActivitySchema,
  ISpyActivitySchema,
  SoundBlendActivitySchema,
  CamelNarrationActivitySchema,
]);

export type Activity = z.infer<typeof ActivitySchema>;

/**
 * Map of activity types to their config schemas
 */
const ACTIVITY_CONFIG_SCHEMAS = {
  show_letter_or_word: ShowLetterOrWordConfigSchema,
  tap_letter_in_word: TapLetterInWordConfigSchema,
  trace_letter: TraceLetterConfigSchema,
  pop_balloons_with_letter: PopBalloonsWithLetterConfigSchema,
  break_time_minigame: BreakTimeMiniGameConfigSchema,
  build_word_from_letters: BuildWordFromLettersConfigSchema,
  multiple_choice_question: MultipleChoiceQuestionConfigSchema,
  drag_items_to_target: DragItemsToTargetConfigSchema,
  catch_fish_with_letter: CatchFishWithLetterConfigSchema,
  add_pizza_toppings_with_letter: AddPizzaToppingsWithLetterConfigSchema,
  drag_dots_to_letter: DragDotsToLetterConfigSchema,
  tap_dot_position: TapDotPositionConfigSchema,
  activity_request: ActivityRequestConfigSchema,
  letter_rain: LetterRainConfigSchema,
  audio_letter_match: AudioLetterMatchConfigSchema,
  memory_card_match: MemoryCardMatchConfigSchema,
  color_letter: ColorLetterConfigSchema,
  letter_discrimination: LetterDiscriminationConfigSchema,
  content_with_cards: ContentWithCardsConfigSchema,
  i_spy: ISpyConfigSchema,
  sound_blend: SoundBlendConfigSchema,
  camel_narration: CamelNarrationConfigSchema,
} as const;

/**
 * Get the config schema for a specific activity type
 *
 * Useful for validating just the config portion of an activity
 * Returns undefined for activity types that don't have schemas yet
 *
 * @example
 * ```typescript
 * const configSchema = getActivityConfigSchema('tap_letter_in_word');
 * if (configSchema) {
 *   const result = configSchema.safeParse(configData);
 * }
 * ```
 */
export function getActivityConfigSchema(type: ActivityType) {
  return ACTIVITY_CONFIG_SCHEMAS[type as keyof typeof ACTIVITY_CONFIG_SCHEMAS];
}

/**
 * Get all activity config schemas as an object
 */
export function getAllActivityConfigSchemas() {
  return ACTIVITY_CONFIG_SCHEMAS;
}
