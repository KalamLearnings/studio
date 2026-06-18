"use client";

import * as React from "react";
import type { BaseActivityFormProps, ActivityType } from "./types";

// Activity form components
import { IntroActivityForm } from "./IntroActivityForm";
import { TapActivityForm } from "./TapActivityForm";
import { WriteActivityForm } from "./WriteActivityForm";
import { BreakActivityForm } from "./BreakActivityForm";
import { BuildWordFromLettersForm } from "./BuildWordFromLettersForm";
import { MultipleChoiceActivityForm } from "./MultipleChoiceActivityForm";
import { DragDropActivityForm } from "./DragDropActivityForm";
import { SpeechPracticeActivityForm } from "./SpeechPracticeActivityForm";
import { MemoryCardMatchActivityForm } from "./MemoryCardMatchActivityForm";
import { DragHarakaToLetterForm } from "./DragHarakaToLetterForm";
import { CamelNarrationActivityForm } from "./CamelNarrationActivityForm";
import { GenericActivityForm } from "./GenericActivityForm";
import { TargetLetterWithDistractorsForm } from "./shared/TargetLetterWithDistractorsForm";
import { DragDotsToLetterForm } from "./DragDotsToLetterForm";
import { TapDotPositionForm } from "./TapDotPositionForm";
import { ColorLetterActivityForm } from "./ColorLetterActivityForm";
import { ActivityRequestForm } from "./ActivityRequestForm";
import { DragHamzaToLetterForm } from "./DragHamzaToLetterForm";
import { ISpyActivityForm } from "./ISpyActivityForm";
import { SoundBlendActivityForm } from "./SoundBlendActivityForm";
import { ContentWithCardsActivityForm } from "./ContentWithCardsActivityForm";
import { MatchPairsActivityForm } from "./MatchPairsActivityForm";

// Re-export types and shared components
export * from "./types";
export * from "./shared";

// Re-export individual forms
export { IntroActivityForm } from "./IntroActivityForm";
export { TapActivityForm } from "./TapActivityForm";
export { WriteActivityForm } from "./WriteActivityForm";
export { BreakActivityForm } from "./BreakActivityForm";
export { BuildWordFromLettersForm } from "./BuildWordFromLettersForm";
export { MultipleChoiceActivityForm } from "./MultipleChoiceActivityForm";
export { DragDropActivityForm } from "./DragDropActivityForm";
export { SpeechPracticeActivityForm } from "./SpeechPracticeActivityForm";
export { MemoryCardMatchActivityForm } from "./MemoryCardMatchActivityForm";
export { DragHarakaToLetterForm } from "./DragHarakaToLetterForm";
export { CamelNarrationActivityForm } from "./CamelNarrationActivityForm";
export { GenericActivityForm } from "./GenericActivityForm";
export { DragDotsToLetterForm } from "./DragDotsToLetterForm";
export { TapDotPositionForm } from "./TapDotPositionForm";
export { ColorLetterActivityForm } from "./ColorLetterActivityForm";
export { ActivityRequestForm } from "./ActivityRequestForm";
export { DragHamzaToLetterForm } from "./DragHamzaToLetterForm";
export { ISpyActivityForm } from "./ISpyActivityForm";
export { SoundBlendActivityForm } from "./SoundBlendActivityForm";
export { ContentWithCardsActivityForm } from "./ContentWithCardsActivityForm";
export { MatchPairsActivityForm } from "./MatchPairsActivityForm";

// Config for activities that use TargetLetterWithDistractorsForm
interface TargetLetterActivityConfig {
  targetLetterHint: string;
  targetCountLabel?: string;
  targetCountHint?: string;
  showLetterPositions?: boolean;
  targetLetterMultiSelect?: boolean;
  showSpeedConfig?: boolean;
  speedField?: string;
  showTargetAudio?: boolean;
}

const targetLetterActivityConfigs: Partial<
  Record<ActivityType, TargetLetterActivityConfig>
> = {
  pop_balloons_with_letter: {
    targetLetterHint: "The letters to find on balloons",
    targetCountHint: "Number of balloons to pop",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
    showSpeedConfig: true,
    speedField: "balloonSpeed",
  },
  letter_rain: {
    targetLetterHint: "The letters to catch",
    targetCountHint: "Number of letters to catch",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
    showSpeedConfig: true,
    speedField: "speed",
  },
  catch_fish_with_letter: {
    targetLetterHint: "The letters to catch on fish",
    targetCountHint: "Number of fish to catch",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
    showSpeedConfig: true,
    speedField: "fishSpeed",
  },
  audio_letter_match: {
    targetLetterHint: "The letter matching the audio",
    targetCountHint: "Number of correct matches",
    showTargetAudio: true,
  },
  letter_discrimination: {
    targetLetterHint: "The correct letter to identify",
    targetCountHint: "Number of correct identifications",
  },
  grid_tap: {
    targetLetterHint: "The letters on cells to tap",
    targetCountHint: "Number of cells to tap",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  pick_from_tree: {
    targetLetterHint: "The letters on fruits to pick",
    targetCountHint: "Number of fruits to pick",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  pick_flowers: {
    targetLetterHint: "The letters on flowers to pick",
    targetCountHint: "Number of flowers to pick",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  tap_crescent_moons: {
    targetLetterHint: "The letters on moons to tap",
    targetCountHint: "Number of moons to tap",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  drag_to_animal_mouth: {
    targetLetterHint: "The letters on food items to drag",
    targetCountHint: "Number of items to feed",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  feed_rabbit: {
    targetLetterHint: "The letters on carrots to drag",
    targetCountHint: "Number of carrots to feed",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  feed_baby: {
    targetLetterHint: "The letters on bottles to drag",
    targetCountHint: "Number of bottles to feed",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  piggy_bank: {
    targetLetterHint: "The letters on coins to collect",
    targetCountHint: "Number of coins to collect",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  snowflakes: {
    targetLetterHint: "The letters on snowflakes to catch",
    targetCountHint: "Number of snowflakes to catch",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  bear_honey: {
    targetLetterHint: "The letters on honey jars to drag",
    targetCountHint: "Number of honey jars to feed",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  fly_on_flowers: {
    targetLetterHint: "The letters on flowers to land on",
    targetCountHint: "Number of flowers to land on",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  deliver_envelope: {
    targetLetterHint: "The letters on houses to deliver to",
    targetCountHint: "Number of envelopes to deliver",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  plant_seeds: {
    targetLetterHint: "The letters on seeds to plant",
    targetCountHint: "Number of seeds to plant",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  balance_scale: {
    targetLetterHint: "The letters on items to balance",
    targetCountHint: "Number of items to balance",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  ice_cream_stacking: {
    targetLetterHint: "The letters on scoops to stack",
    targetCountHint: "Number of scoops to stack",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  slingshot: {
    targetLetterHint: "The letters on targets to hit",
    targetCountHint: "Number of targets to hit",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
  add_pizza_toppings_with_letter: {
    targetLetterHint: "The letters on toppings to add",
    targetCountHint: "Number of toppings to add",
    targetLetterMultiSelect: true,
    showLetterPositions: false,
  },
};

// Factory function to create TargetLetterWithDistractorsForm with specific config
function createTargetLetterForm(
  activityType: ActivityType
): React.ComponentType<BaseActivityFormProps> {
  const formConfig = targetLetterActivityConfigs[activityType];
  if (!formConfig) return GenericActivityForm;

  return function TargetLetterForm(props: BaseActivityFormProps) {
    return (
      <TargetLetterWithDistractorsForm
        {...props}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config={props.config as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange={props.onChange as any}
        labels={{
          targetLetterLabel: formConfig.targetLetterMultiSelect
            ? "Target Letters"
            : "Target Letter",
          targetLetterHint: formConfig.targetLetterHint,
          targetCountLabel: formConfig.targetCountLabel,
          targetCountHint: formConfig.targetCountHint,
        }}
        showLetterPositions={formConfig.showLetterPositions !== false}
        targetLetterMultiSelect={formConfig.targetLetterMultiSelect}
        showSpeedConfig={formConfig.showSpeedConfig}
        speedField={formConfig.speedField}
        showTargetAudio={formConfig.showTargetAudio}
      />
    );
  };
}

// Map of activity types to their form components
type FormComponent = React.ComponentType<BaseActivityFormProps>;

const activityFormComponents: Partial<Record<ActivityType, FormComponent>> = {
  // Custom forms (unique UI)
  show_letter_or_word: IntroActivityForm,
  tap_letter_in_word: TapActivityForm,
  trace_letter: WriteActivityForm,
  break_time_minigame: BreakActivityForm,
  build_word_from_letters: BuildWordFromLettersForm,
  multiple_choice_question: MultipleChoiceActivityForm,
  drag_items_to_target: DragDropActivityForm,
  speech_practice: SpeechPracticeActivityForm,
  memory_card_match: MemoryCardMatchActivityForm,
  drag_haraka_to_letter: DragHarakaToLetterForm,
  camel_narration: CamelNarrationActivityForm,

  // Custom forms for additional activities
  drag_dots_to_letter: DragDotsToLetterForm,
  tap_dot_position: TapDotPositionForm,
  color_letter: ColorLetterActivityForm,
  activity_request: ActivityRequestForm,
  content_with_cards: ContentWithCardsActivityForm,
  drag_hamza_to_letter: DragHamzaToLetterForm,
  i_spy: ISpyActivityForm,
  sound_blend: SoundBlendActivityForm,
  match_pairs: MatchPairsActivityForm,

  // Target letter + distractor activities (using shared form)
  pop_balloons_with_letter: createTargetLetterForm("pop_balloons_with_letter"),
  letter_rain: createTargetLetterForm("letter_rain"),
  catch_fish_with_letter: createTargetLetterForm("catch_fish_with_letter"),
  audio_letter_match: createTargetLetterForm("audio_letter_match"),
  letter_discrimination: createTargetLetterForm("letter_discrimination"),
  grid_tap: createTargetLetterForm("grid_tap"),
  pick_from_tree: createTargetLetterForm("pick_from_tree"),
  pick_flowers: createTargetLetterForm("pick_flowers"),
  tap_crescent_moons: createTargetLetterForm("tap_crescent_moons"),
  drag_to_animal_mouth: createTargetLetterForm("drag_to_animal_mouth"),
  feed_rabbit: createTargetLetterForm("feed_rabbit"),
  feed_baby: createTargetLetterForm("feed_baby"),
  piggy_bank: createTargetLetterForm("piggy_bank"),
  snowflakes: createTargetLetterForm("snowflakes"),
  bear_honey: createTargetLetterForm("bear_honey"),
  fly_on_flowers: createTargetLetterForm("fly_on_flowers"),
  deliver_envelope: createTargetLetterForm("deliver_envelope"),
  plant_seeds: createTargetLetterForm("plant_seeds"),
  balance_scale: createTargetLetterForm("balance_scale"),
  ice_cream_stacking: createTargetLetterForm("ice_cream_stacking"),
  slingshot: createTargetLetterForm("slingshot"),
  add_pizza_toppings_with_letter: createTargetLetterForm(
    "add_pizza_toppings_with_letter"
  ),
};

/**
 * Get the form component for a specific activity type.
 * Returns GenericActivityForm if no specific form exists.
 */
export function getActivityFormComponent(
  type: string
): React.ComponentType<BaseActivityFormProps> {
  const component = activityFormComponents[type as ActivityType];
  return component || GenericActivityForm;
}

/**
 * Check if a specific activity form exists for a type.
 */
export function hasCustomActivityForm(type: string): boolean {
  return type in activityFormComponents;
}

// Activity form options - controls what fields are shown in ActivityFormModal
export interface ActivityFormOptions {
  hideInstruction?: boolean;
}

const activityFormOptions: Partial<Record<ActivityType, ActivityFormOptions>> =
  {
    camel_narration: { hideInstruction: true },
  };

/**
 * Get display options for an activity form.
 */
export function getActivityFormOptions(type: string): ActivityFormOptions {
  return activityFormOptions[type as ActivityType] || {};
}
