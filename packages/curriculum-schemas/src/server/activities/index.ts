/**
 * Activity schemas - centralized exports
 *
 * This file exports all activity schemas and creates a discriminated union
 * for type-safe activity handling.
 */

import { z } from 'zod';

// Export all individual activity schemas and types
export * from './show_letter_or_word.ts';
export * from './tap_letter_in_word.ts';
export * from './trace_letter.ts';
export * from './pop_balloons_with_letter.ts';
export * from './break_time_minigame.ts';
export * from './build_word_from_letters.ts';
export * from './multiple_choice_question.ts';
export * from './drag_items_to_target.ts';
export * from './catch_fish_with_letter.ts';
export * from './add_pizza_toppings_with_letter.ts';
export * from './letter_rain.ts';
export * from './memory_card_match.ts';
export * from './audio_letter_match.ts';
export * from './color_letter.ts';
export * from './letter_discrimination.ts';
export * from './drag_hamza_to_letter.ts';
export * from './drag_haraka_to_letter.ts';
export * from './drag_haraka_to_word.ts';
export * from './slingshot.ts';
export * from './i_spy.ts';
export * from './sound_blend.ts';
export * from './word_split_blend.ts';
export * from './drive_to_sukoon.ts';
export * from './drive_to_shadda.ts';
export * from './stretch_madd.ts';
export * from './match_pairs.ts';

export * from './animation_intro.ts';
export * from './letter_hunt.ts';
export * from './content_with_cards.ts';
export * from './speech_practice.ts';
export * from './drag_dots_to_letter.ts';
export * from './tap_dot_position.ts';
export * from './camel_narration.ts';
export * from './activity_request.ts';
export * from './read_and_match.ts';
export * from './sentence_builder.ts';
export * from './sound_sort.ts';

// Import schemas for discriminated union and config schemas for helper function
import {
  ShowLetterOrWordActivitySchema,
  ShowLetterOrWordConfigSchema,
} from './show_letter_or_word.ts';
import { AnimationIntroActivitySchema, AnimationIntroConfigSchema } from './animation_intro.ts';
import {
  TapLetterInWordActivitySchema,
  TapLetterInWordConfigSchema,
} from './tap_letter_in_word.ts';
import { TraceLetterActivitySchema, TraceLetterConfigSchema } from './trace_letter.ts';
import {
  PopBalloonsWithLetterActivitySchema,
  PopBalloonsWithLetterConfigSchema,
} from './pop_balloons_with_letter.ts';
import {
  BreakTimeMiniGameActivitySchema,
  BreakTimeMiniGameConfigSchema,
} from './break_time_minigame.ts';
import {
  BuildWordFromLettersActivitySchema,
  BuildWordFromLettersConfigSchema,
} from './build_word_from_letters.ts';
import {
  MultipleChoiceQuestionActivitySchema,
  MultipleChoiceQuestionConfigSchema,
} from './multiple_choice_question.ts';
import {
  DragItemsToTargetActivitySchema,
  DragItemsToTargetConfigSchema,
} from './drag_items_to_target.ts';
import {
  CatchFishWithLetterActivitySchema,
  CatchFishWithLetterConfigSchema,
} from './catch_fish_with_letter.ts';
import {
  AddPizzaToppingsWithLetterActivitySchema,
  AddPizzaToppingsWithLetterConfigSchema,
} from './add_pizza_toppings_with_letter.ts';
import { LetterRainActivitySchema, LetterRainConfigSchema } from './letter_rain.ts';
import { MemoryCardMatchActivitySchema, MemoryCardMatchConfigSchema } from './memory_card_match.ts';
import {
  AudioLetterMatchActivitySchema,
  AudioLetterMatchConfigSchema,
} from './audio_letter_match.ts';
import { ColorLetterActivitySchema, ColorLetterConfigSchema } from './color_letter.ts';
import {
  LetterDiscriminationActivitySchema,
  LetterDiscriminationConfigSchema,
} from './letter_discrimination.ts';
import {
  DragHamzaToLetterActivitySchema,
  DragHamzaToLetterConfigSchema,
} from './drag_hamza_to_letter.ts';
import {
  DragHarakaToLetterActivitySchema,
  DragHarakaToLetterConfigSchema,
} from './drag_haraka_to_letter.ts';
import {
  DragHarakaToWordActivitySchema,
  DragHarakaToWordConfigSchema,
} from './drag_haraka_to_word.ts';
import { SlingshotActivitySchema, SlingshotConfigSchema } from './slingshot.ts';
import { ISpyActivitySchema, ISpyConfigSchema } from './i_spy.ts';
import { SoundBlendActivitySchema, SoundBlendConfigSchema } from './sound_blend.ts';
import { WordSplitBlendActivitySchema, WordSplitBlendConfigSchema } from './word_split_blend.ts';
import { DriveToSukoonActivitySchema, DriveToSukoonConfigSchema } from './drive_to_sukoon.ts';
import { DriveToShaddaActivitySchema, DriveToShaddaConfigSchema } from './drive_to_shadda.ts';
import {
  StretchMaddActivitySchema,
  StretchMaddConfigSchema,
  StretchMaddReadSchema,
} from './stretch_madd.ts';
import { MatchPairsActivitySchema, MatchPairsConfigSchema } from './match_pairs.ts';

import {
  ContentWithCardsActivitySchema,
  ContentWithCardsConfigSchema,
  ContentWithCardsReadSchema,
} from './content_with_cards.ts';
import {
  SpeechPracticeActivitySchema,
  SpeechPracticeConfigSchema,
  SpeechPracticeReadSchema,
} from './speech_practice.ts';
import {
  DragDotsToLetterActivitySchema,
  DragDotsToLetterConfigSchema,
  DragDotsToLetterReadSchema,
} from './drag_dots_to_letter.ts';
import {
  TapDotPositionActivitySchema,
  TapDotPositionConfigSchema,
  TapDotPositionReadSchema,
} from './tap_dot_position.ts';
import {
  CamelNarrationActivitySchema,
  CamelNarrationConfigSchema,
  CamelNarrationReadSchema,
} from './camel_narration.ts';
import {
  ActivityRequestActivitySchema,
  ActivityRequestConfigSchema,
  ActivityRequestReadSchema,
} from './activity_request.ts';
import {
  ReadAndMatchActivitySchema,
  ReadAndMatchConfigSchema,
  ReadAndMatchReadSchema,
} from './read_and_match.ts';
import {
  SentenceBuilderActivitySchema,
  SentenceBuilderConfigSchema,
  SentenceBuilderReadSchema,
} from './sentence_builder.ts';
import {
  SoundSortActivitySchema,
  SoundSortConfigSchema,
  SoundSortReadSchema,
} from './sound_sort.ts';
import { THEMED_LETTER_HUNT_CONFIG_SCHEMAS, ThemedLetterHuntReadSchema } from './letter_hunt.ts';
import { ShowLetterOrWordReadSchema } from './show_letter_or_word.ts';
import { AnimationIntroReadSchema } from './animation_intro.ts';
import { TapLetterInWordReadSchema } from './tap_letter_in_word.ts';
import { TraceLetterReadSchema } from './trace_letter.ts';
import { PopBalloonsWithLetterReadSchema } from './pop_balloons_with_letter.ts';
import { BreakTimeMiniGameReadSchema } from './break_time_minigame.ts';
import { BuildWordFromLettersReadSchema } from './build_word_from_letters.ts';
import { MultipleChoiceQuestionReadSchema } from './multiple_choice_question.ts';
import { DragItemsToTargetReadSchema } from './drag_items_to_target.ts';
import { CatchFishWithLetterReadSchema } from './catch_fish_with_letter.ts';
import { AddPizzaToppingsWithLetterReadSchema } from './add_pizza_toppings_with_letter.ts';
import { LetterRainReadSchema } from './letter_rain.ts';
import { MemoryCardMatchReadSchema } from './memory_card_match.ts';
import { AudioLetterMatchReadSchema } from './audio_letter_match.ts';
import { ColorLetterReadSchema } from './color_letter.ts';
import { LetterDiscriminationReadSchema } from './letter_discrimination.ts';
import { DragHamzaToLetterReadSchema } from './drag_hamza_to_letter.ts';
import { DragHarakaToLetterReadSchema } from './drag_haraka_to_letter.ts';
import { DragHarakaToWordReadSchema } from './drag_haraka_to_word.ts';
import { SlingshotReadSchema } from './slingshot.ts';
import { ISpyReadSchema } from './i_spy.ts';
import { SoundBlendReadSchema } from './sound_blend.ts';
import { WordSplitBlendReadSchema } from './word_split_blend.ts';
import { DriveToSukoonReadSchema } from './drive_to_sukoon.ts';
import { DriveToShaddaReadSchema } from './drive_to_shadda.ts';
import { MatchPairsReadSchema } from './match_pairs.ts';

import type { ActivityType } from '../base.ts';

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
  AnimationIntroActivitySchema,
  TapLetterInWordActivitySchema,
  TraceLetterActivitySchema,
  PopBalloonsWithLetterActivitySchema,
  BreakTimeMiniGameActivitySchema,
  BuildWordFromLettersActivitySchema,
  MultipleChoiceQuestionActivitySchema,
  DragItemsToTargetActivitySchema,
  CatchFishWithLetterActivitySchema,
  AddPizzaToppingsWithLetterActivitySchema,
  LetterRainActivitySchema,
  MemoryCardMatchActivitySchema,
  AudioLetterMatchActivitySchema,
  ColorLetterActivitySchema,
  LetterDiscriminationActivitySchema,
  DragHamzaToLetterActivitySchema,
  DragHarakaToLetterActivitySchema,
  DragHarakaToWordActivitySchema,
  SlingshotActivitySchema,
  ISpyActivitySchema,
  SoundBlendActivitySchema,
  WordSplitBlendActivitySchema,
  DriveToSukoonActivitySchema,
  DriveToShaddaActivitySchema,
  StretchMaddActivitySchema,
  MatchPairsActivitySchema,
  ContentWithCardsActivitySchema,
  SpeechPracticeActivitySchema,
  DragDotsToLetterActivitySchema,
  TapDotPositionActivitySchema,
  CamelNarrationActivitySchema,
  ActivityRequestActivitySchema,
  ReadAndMatchActivitySchema,
  SentenceBuilderActivitySchema,
  SoundSortActivitySchema,
]);

export type Activity = z.infer<typeof ActivitySchema>;

/**
 * Write schema per activity type (CM-B7): what a save must send. For every
 * type but the ones listed in `LEGACY_WRITE_SCHEMA_TYPES` it is strict and
 * canonical: references only, derived fields rejected. Save validation is
 * not on yet (CM-B8a turns it on, type by type).
 */
const ACTIVITY_CONFIG_SCHEMAS: Record<ActivityType, z.ZodTypeAny> = {
  ...THEMED_LETTER_HUNT_CONFIG_SCHEMAS,
  show_letter_or_word: ShowLetterOrWordConfigSchema,
  animation_intro: AnimationIntroConfigSchema,
  tap_letter_in_word: TapLetterInWordConfigSchema,
  trace_letter: TraceLetterConfigSchema,
  pop_balloons_with_letter: PopBalloonsWithLetterConfigSchema,
  break_time_minigame: BreakTimeMiniGameConfigSchema,
  build_word_from_letters: BuildWordFromLettersConfigSchema,
  multiple_choice_question: MultipleChoiceQuestionConfigSchema,
  drag_items_to_target: DragItemsToTargetConfigSchema,
  catch_fish_with_letter: CatchFishWithLetterConfigSchema,
  add_pizza_toppings_with_letter: AddPizzaToppingsWithLetterConfigSchema,
  letter_rain: LetterRainConfigSchema,
  memory_card_match: MemoryCardMatchConfigSchema,
  audio_letter_match: AudioLetterMatchConfigSchema,
  color_letter: ColorLetterConfigSchema,
  letter_discrimination: LetterDiscriminationConfigSchema,
  drag_dots_to_letter: DragDotsToLetterConfigSchema,
  tap_dot_position: TapDotPositionConfigSchema,
  activity_request: ActivityRequestConfigSchema,
  speech_practice: SpeechPracticeConfigSchema,
  content_with_cards: ContentWithCardsConfigSchema,
  drag_hamza_to_letter: DragHamzaToLetterConfigSchema,
  drag_haraka_to_letter: DragHarakaToLetterConfigSchema,
  drag_haraka_to_word: DragHarakaToWordConfigSchema,
  slingshot: SlingshotConfigSchema,
  i_spy: ISpyConfigSchema,
  sound_blend: SoundBlendConfigSchema,
  word_split_blend: WordSplitBlendConfigSchema,
  drive_to_sukoon: DriveToSukoonConfigSchema,
  drive_to_shadda: DriveToShaddaConfigSchema,
  stretch_madd: StretchMaddConfigSchema,
  match_pairs: MatchPairsConfigSchema,
  camel_narration: CamelNarrationConfigSchema,
  read_and_match: ReadAndMatchConfigSchema,
  sentence_builder: SentenceBuilderConfigSchema,
  sound_sort: SoundSortConfigSchema,
};

/**
 * Types whose write schema is not yet canonical (CM-B7; MCQ and match pairs
 * moved to content items in CM-B12): the word-bearing types that still store copied word strings (their `wordRef`
 * comes with S3), the break, the animation and the two types with no PROD
 * rows and no Studio form of their own. Their config schema is the earlier,
 * non-strict one.
 */
export const LEGACY_WRITE_SCHEMA_TYPES: readonly ActivityType[] = [
  'sound_blend',
  'word_split_blend',
  'tap_letter_in_word',
  'build_word_from_letters',
  'drive_to_sukoon',
  'drive_to_shadda',
  'drag_haraka_to_word',
  'break_time_minigame',
  'animation_intro',
  'add_pizza_toppings_with_letter',
  'drag_items_to_target',
];

/**
 * Read schema per activity type (CM-B7): what is stored today. A pure
 * normaliser maps every legacy shape found on PROD to the canonical shape
 * (Studio's `normalizeActivityConfig` rules and more), so the content index
 * extractors (CM-B9) and the graders (CM-B27) read one shape. The output is
 * the normalised config, with no defaults added and no keys stripped. Deleted
 * with the shim (design 6, P8).
 */
const ACTIVITY_READ_SCHEMAS: Record<ActivityType, z.ZodTypeAny> = {
  ...Object.fromEntries(
    Object.keys(THEMED_LETTER_HUNT_CONFIG_SCHEMAS).map((t) => [t, ThemedLetterHuntReadSchema]),
  ),
  show_letter_or_word: ShowLetterOrWordReadSchema,
  animation_intro: AnimationIntroReadSchema,
  tap_letter_in_word: TapLetterInWordReadSchema,
  trace_letter: TraceLetterReadSchema,
  pop_balloons_with_letter: PopBalloonsWithLetterReadSchema,
  break_time_minigame: BreakTimeMiniGameReadSchema,
  build_word_from_letters: BuildWordFromLettersReadSchema,
  multiple_choice_question: MultipleChoiceQuestionReadSchema,
  drag_items_to_target: DragItemsToTargetReadSchema,
  catch_fish_with_letter: CatchFishWithLetterReadSchema,
  add_pizza_toppings_with_letter: AddPizzaToppingsWithLetterReadSchema,
  letter_rain: LetterRainReadSchema,
  memory_card_match: MemoryCardMatchReadSchema,
  audio_letter_match: AudioLetterMatchReadSchema,
  color_letter: ColorLetterReadSchema,
  letter_discrimination: LetterDiscriminationReadSchema,
  drag_dots_to_letter: DragDotsToLetterReadSchema,
  tap_dot_position: TapDotPositionReadSchema,
  activity_request: ActivityRequestReadSchema,
  speech_practice: SpeechPracticeReadSchema,
  content_with_cards: ContentWithCardsReadSchema,
  drag_hamza_to_letter: DragHamzaToLetterReadSchema,
  drag_haraka_to_letter: DragHarakaToLetterReadSchema,
  drag_haraka_to_word: DragHarakaToWordReadSchema,
  slingshot: SlingshotReadSchema,
  i_spy: ISpyReadSchema,
  sound_blend: SoundBlendReadSchema,
  word_split_blend: WordSplitBlendReadSchema,
  drive_to_sukoon: DriveToSukoonReadSchema,
  drive_to_shadda: DriveToShaddaReadSchema,
  stretch_madd: StretchMaddReadSchema,
  match_pairs: MatchPairsReadSchema,
  camel_narration: CamelNarrationReadSchema,
  read_and_match: ReadAndMatchReadSchema,
  sentence_builder: SentenceBuilderReadSchema,
  sound_sort: SoundSortReadSchema,
} as Record<ActivityType, z.ZodTypeAny>;

/**
 * Get the write (config) schema for a specific activity type
 *
 * @example
 * ```typescript
 * const configSchema = getActivityConfigSchema('tap_letter_in_word');
 * const result = configSchema.safeParse(configData);
 * ```
 */
export function getActivityConfigSchema(type: ActivityType): z.ZodTypeAny {
  return ACTIVITY_CONFIG_SCHEMAS[type];
}

/**
 * Get all activity config schemas as an object
 */
export function getAllActivityConfigSchemas() {
  return ACTIVITY_CONFIG_SCHEMAS;
}

/** Get the read schema for a specific activity type (CM-B7). */
export function getActivityReadSchema(type: ActivityType): z.ZodTypeAny {
  return ACTIVITY_READ_SCHEMAS[type];
}

/** The result of reading a stored config: the canonical config, or the issues. */
export type ReadActivityConfigResult =
  | { success: true; config: Record<string, unknown> }
  | { success: false; issues: z.ZodIssue[] };

/**
 * Read a stored config into the canonical shape of its type (pure). An
 * unknown type or an unreadable config returns the issues.
 */
export function readActivityConfig(type: string, config: unknown): ReadActivityConfigResult {
  const schema = Object.prototype.hasOwnProperty.call(ACTIVITY_READ_SCHEMAS, type)
    ? ACTIVITY_READ_SCHEMAS[type as ActivityType]
    : undefined;
  if (!schema) {
    return {
      success: false,
      issues: [{
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: `Unknown activity type ${type}`,
      }],
    };
  }
  const result = schema.safeParse(config);
  return result.success
    ? { success: true, config: result.data as Record<string, unknown> }
    : { success: false, issues: result.error.issues };
}
