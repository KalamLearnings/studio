/**
 * Curriculum constants - Single source of truth for activity types, labels, and icons
 */

// Using string type for flexibility since the schema may not include all activity types yet
type ActivityTypeString = string;

/**
 * Activity category definitions
 */
export type ActivityCategory =
  | 'all'
  | 'introduction'
  | 'writing'
  | 'tap'
  | 'drag'
  | 'catch'
  | 'feeding'
  | 'learning'
  | 'misc';

export interface ActivityCategoryInfo {
  id: ActivityCategory;
  label: string;
  icon: string;
}

export const ACTIVITY_CATEGORIES: ActivityCategoryInfo[] = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'introduction', label: 'Intro', icon: '📖' },
  { id: 'writing', label: 'Write', icon: '✏️' },
  { id: 'tap', label: 'Tap', icon: '👆' },
  { id: 'drag', label: 'Drag', icon: '🎯' },
  { id: 'catch', label: 'Catch', icon: '🎮' },
  { id: 'feeding', label: 'Feed', icon: '🍽️' },
  { id: 'learning', label: 'Learn', icon: '🧠' },
  { id: 'misc', label: 'Misc', icon: '☕' },
];

/**
 * Mapping of activity types to their categories
 */
export const ACTIVITY_TYPE_CATEGORIES: Record<ActivityTypeString, ActivityCategory> = {
  // Introduction & Display
  show_letter_or_word: 'introduction',
  content_with_cards: 'introduction',
  camel_narration: 'introduction',

  // Writing & Tracing
  trace_letter: 'writing',
  color_letter: 'writing',

  // Tap & Select
  tap_letter_in_word: 'tap',
  tap_dot_position: 'tap',
  grid_tap: 'tap',
  tap_crescent_moons: 'tap',
  pop_balloons_with_letter: 'tap',

  // Drag & Drop
  drag_items_to_target: 'drag',
  drag_to_animal_mouth: 'drag',
  balance_scale: 'drag',
  drag_hamza_to_letter: 'drag',
  drag_haraka_to_letter: 'drag',
  drag_dots_to_letter: 'drag',

  // Catch & Collect
  catch_fish_with_letter: 'catch',
  letter_rain: 'catch',
  snowflakes: 'catch',
  pick_from_tree: 'catch',
  pick_flowers: 'catch',
  fly_on_flowers: 'catch',
  bear_honey: 'catch',
  piggy_bank: 'catch',

  // Feeding & Delivery
  add_pizza_toppings_with_letter: 'feeding',
  feed_rabbit: 'feeding',
  feed_baby: 'feeding',
  deliver_envelope: 'feeding',
  plant_seeds: 'feeding',
  ice_cream_stacking: 'feeding',

  // Learning & Practice
  build_word_from_letters: 'learning',
  multiple_choice_question: 'learning',
  audio_letter_match: 'learning',
  memory_card_match: 'learning',
  letter_discrimination: 'learning',
  speech_practice: 'learning',

  // Misc
  break_time_minigame: 'misc',
  activity_request: 'misc',
  slingshot: 'misc',
  i_spy: 'tap',
  sound_blend: 'learning',
  match_pairs: 'drag',
};

/**
 * Get activities by category
 */
export function getActivitiesByCategory(category: ActivityCategory): string[] {
  if (category === 'all') {
    return ACTIVITY_TYPES.map(at => at.value);
  }
  return Object.entries(ACTIVITY_TYPE_CATEGORIES)
    .filter(([_, cat]) => cat === category)
    .map(([type, _]) => type);
}

/**
 * Get activity count by category
 */
export function getActivityCountByCategory(category: ActivityCategory): number {
  return getActivitiesByCategory(category).length;
}

/**
 * Activity type definitions with labels
 */
export const ACTIVITY_TYPES: { value: string; label: string }[] = [
  { value: 'show_letter_or_word', label: 'Show Letter/Word/Image' },
  { value: 'tap_letter_in_word', label: 'Tap Target Letters in Word' },
  { value: 'trace_letter', label: 'Letter Tracing' },
  { value: 'pop_balloons_with_letter', label: 'Pop Balloons with Target Letter' },
  { value: 'break_time_minigame', label: 'Break Time Mini-Game' },
  { value: 'build_word_from_letters', label: 'Build Words from Letters' },
  { value: 'multiple_choice_question', label: 'Multiple Choice Question' },
  { value: 'drag_items_to_target', label: 'Drag Items to Correct Targets' },
  { value: 'catch_fish_with_letter', label: 'Catch Fish with Target Letter' },
  { value: 'add_pizza_toppings_with_letter', label: 'Add Pizza Toppings with Letter' },
  { value: 'drag_dots_to_letter', label: 'Drag Dots to Letter' },
  { value: 'tap_dot_position', label: 'Tap Correct Dot Position' },
  { value: 'letter_rain', label: 'Letter Rain (Physics)' },
  { value: 'audio_letter_match', label: 'Audio Letter Match' },
  { value: 'memory_card_match', label: 'Memory Card Match' },
  { value: 'color_letter', label: 'Letter Coloring' },
  { value: 'letter_discrimination', label: 'Similar Letter Discrimination' },
  { value: 'speech_practice', label: 'Speech Pronunciation Practice' },
  { value: 'activity_request', label: 'Activity Request (Not Implemented)' },
  // New themed activities
  { value: 'grid_tap', label: 'Grid Tap (Select Letters)' },
  { value: 'pick_from_tree', label: 'Pick Fruit from Tree' },
  { value: 'pick_flowers', label: 'Pick Flowers in Field' },
  { value: 'tap_crescent_moons', label: 'Tap Crescent Moons' },
  { value: 'drag_to_animal_mouth', label: 'Drag to Animal Mouth' },
  { value: 'feed_rabbit', label: 'Feed the Rabbit' },
  { value: 'feed_baby', label: 'Feed the Baby' },
  { value: 'piggy_bank', label: 'Piggy Bank Coins' },
  { value: 'snowflakes', label: 'Catch Snowflakes' },
  { value: 'bear_honey', label: 'Bear Honey Collection' },
  { value: 'fly_on_flowers', label: 'Fly on Flowers' },
  { value: 'deliver_envelope', label: 'Deliver Envelope' },
  { value: 'plant_seeds', label: 'Plant Seeds' },
  { value: 'balance_scale', label: 'Balance Scale' },
  { value: 'ice_cream_stacking', label: 'Ice Cream Stacking' },
  { value: 'content_with_cards', label: 'Content with Cards' },
  { value: 'drag_hamza_to_letter', label: 'Drag Hamza to Letter' },
  { value: 'drag_haraka_to_letter', label: 'Drag Haraka to Letter' },
  { value: 'slingshot', label: 'Slingshot Game' },
  { value: 'i_spy', label: 'I Spy (Find Letters)' },
  { value: 'sound_blend', label: 'Sound Blending' },
  { value: 'match_pairs', label: 'Match Pairs (Draw Lines)' },
  { value: 'camel_narration', label: 'Camel Mascot Narration' },
];

/**
 * Activity type icons
 */
export const ACTIVITY_ICONS: Record<string, string> = {
  show_letter_or_word: '🔤',
  tap_letter_in_word: '👆',
  trace_letter: '✏️',
  pop_balloons_with_letter: '🎈',
  break_time_minigame: '☕',
  build_word_from_letters: '🔨',
  multiple_choice_question: '❓',
  drag_items_to_target: '🎯',
  catch_fish_with_letter: '🎣',
  add_pizza_toppings_with_letter: '🍕',
  drag_dots_to_letter: '⚫',
  tap_dot_position: '🎯',
  letter_rain: '🌧️',
  audio_letter_match: '🔊',
  memory_card_match: '🃏',
  color_letter: '🎨',
  letter_discrimination: '👀',
  speech_practice: '🎙️',
  activity_request: '💡',
  // New themed activities
  grid_tap: '🔲',
  pick_from_tree: '🍎',
  pick_flowers: '🌸',
  tap_crescent_moons: '🌙',
  drag_to_animal_mouth: '🐕',
  feed_rabbit: '🐰',
  feed_baby: '👶',
  piggy_bank: '🐷',
  snowflakes: '❄️',
  bear_honey: '🐻',
  fly_on_flowers: '🪰',
  deliver_envelope: '✉️',
  plant_seeds: '🌱',
  balance_scale: '⚖️',
  ice_cream_stacking: '🍦',
  content_with_cards: '🃏',
  drag_hamza_to_letter: 'ء',
  drag_haraka_to_letter: 'فَ',
  slingshot: '🎯',
  i_spy: '👁️',
  sound_blend: '🐢',
  match_pairs: '🔗',
  camel_narration: '🐪',
};

/**
 * Get activity label by type
 */
export function getActivityLabel(type: string): string {
  return ACTIVITY_TYPES.find(at => at.value === type)?.label || 'Activity';
}

/**
 * Get activity icon by type
 */
export function getActivityIcon(type: string): string {
  return ACTIVITY_ICONS[type] || '📝';
}
