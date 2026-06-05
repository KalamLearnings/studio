/**
 * TypeScript types for activity configurations
 *
 * These types provide type safety for activity configs throughout the dashboard.
 * Based on the Zod schemas defined in the backend.
 */

import type { ArticleType } from '@/lib/schemas/curriculum';

// Base types
export type ContentType = 'letter' | 'word';
export type LetterPosition = 'isolated' | 'initial' | 'medial' | 'final';
export type BreakVariant = 'tracing_lines' | 'dot_tapping' | 'coloring' | 'memory_game' | 'tap_shapes';
export type WritingMode = 'guided' | 'freehand';
export type HamzaPosition = 'above' | 'below' | 'on_line';
export type HarakaType = 'fatha' | 'damma' | 'kasra' | 'sukoon' | 'shadda';
export type ShapeType = 'circle' | 'square' | 'triangle' | 'star' | 'rectangle' | 'diamond' | 'oval' | 'heart';
export type SoundDuration = 1 | 2 | 3;
export type BlendContentType = 'letter' | 'word';
export type BlendSpeed = 'none' | 'slow' | 'fast';

/**
 * Show Letter or Word Activity Config
 */
export interface ShowLetterOrWordConfig {
  contentType: ContentType;
  letter?: string;
  word?: string;
  position?: LetterPosition;
  autoAdvance?: boolean;
  displayDuration?: number;
}

/**
 * Tap Letter in Word Activity Config
 */
export interface TapLetterInWordConfig {
  targetWord: string;
  targetLetter: string;
  targetCount: number;
  showHighlight?: boolean;
  highlightColor?: string;
  provideFeedback?: boolean;
  wordMeaning?: string;
}

/**
 * Trace Letter Activity Config
 */
export interface TraceLetterConfig {
  letterForm: string;
  mode?: WritingMode;
  traceCount?: number;
  maxAttempts?: number;
  recognitionTolerance?: number;
}

/**
 * Pop Balloons with Letter Activity Config
 */
export interface PopBalloonsWithLetterConfig {
  correctLetter: string;
  correctLetterForms?: string[];
  distractorLetters: string[];
  duration?: number;
  targetCount?: number;
  balloonSpeed?: number;
  spawnRate?: number;
  correctRatio?: number;
}

/**
 * Break Time Mini-Game Activity Config
 */
export interface BreakTimeMiniGameConfig {
  variant: BreakVariant;
  duration?: number;
  // Tracing Lines
  linePattern?: string;
  // Dot Tapping
  dotCount?: number;
  dotPattern?: string;
  color?: string;
  // Coloring
  coloringImage?: string;
  availableColors?: string[];
  // Memory Game
  cardCount?: number;
  pairCount?: number; // deprecated, use cardCount
  // Tap Shapes (tap all target shapes)
  targetShape?: ShapeType;
  targetCount?: number;
  totalShapes?: number;
}

/**
 * Build Word from Letters Activity Config
 */
export interface BuildWordFromLettersConfig {
  targetWord?: string;
  useChildName?: boolean;
  showConnectedForm?: boolean;
  highlightCorrectPositions?: boolean;
  scrambleLetters?: boolean;
  showWordMeaning?: boolean;
  wordMeaning?: {
    en: string;
    ar: string;
  };
}

/**
 * Multiple Choice Question Activity Config
 */
export interface MultipleChoiceOption {
  id: string;
  text: { en: string; ar: string };
  image?: string;
  isCorrect: boolean;
}

export interface MultipleChoiceQuestionConfig {
  question: { en: string; ar: string };
  questionImage?: string;
  mode?: 'text' | 'image'; // Display mode for options
  options: MultipleChoiceOption[];
  correctOptionId?: string;
  targetLetter?: string;
  layout?: 'vertical' | 'horizontal' | 'grid';
  randomizeOptions?: boolean;
}

/**
 * Drag Items to Target Activity Config
 */
export interface DragItemsToTargetConfig {
  items: Array<{ id: string; content: string; correctTarget: string }>;
  targets: Array<{ id: string; label: string }>;
  showFeedback?: boolean;
}

/**
 * Catch Fish with Letter Activity Config
 */
export interface CatchFishWithLetterConfig {
  correctLetter: string;
  distractorLetters: string[];
  duration: number;
  targetCount: number;
  letterPositions?: LetterPosition[];
}

/**
 * Add Pizza Toppings with Letter Activity Config
 */
export interface AddPizzaToppingsWithLetterConfig {
  correctLetter: string;
  distractorLetters: string[];
  targetCount: number;
}

/**
 * Letter Rain Activity Config
 */
export interface LetterRainConfig {
  targetLetter: string;
  distractorLetters: string[];
  targetCount: number;
  speed?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  letterPositions?: LetterPosition[];
}


/**
 * Audio Letter Match Activity Config
 */
export interface AudioLetterMatchConfig {
  targetLetter: string;
  distractorLetters: string[];
  playAudioOnStart?: boolean;
  allowReplay?: boolean;
  showLetterNames?: boolean;
}

/**
 * Memory Card Match Activity Config
 */
export interface MemoryCardLetter {
  letterId: string;
  form: LetterPosition;
  /** Optional: form for the matching card (enables cross-form matching) */
  matchingForm?: LetterPosition;
  /** Optional: audio asset ID for letter_to_sound matching mode */
  audioId?: string;
  /** Optional: audio storage path for backend URL resolution */
  audioPath?: string;
}

export interface MemoryCardMatchConfig {
  letters: MemoryCardLetter[];
  cardCount?: number;
  matchType?: 'letter_to_letter' | 'letter_to_sound' | 'form_to_form';
  timeLimit?: number;
  showHints?: boolean;
}

/**
 * Color Letter Activity Config
 */
export interface ColorLetterConfig {
  letter: string;
  letterForm?: 'isolated' | 'initial' | 'medial' | 'final';
  colorPalette?: string[];
  strokeWidth?: number;
  allowEraser?: boolean;
  saveDrawing?: boolean;
}

/**
 * Letter Discrimination Activity Config
 */
export interface LetterDiscriminationConfig {
  targetLetter: string;
  confusableLetter: string;
  distractorLetters?: string[];
  prompt: string;
  showInForm?: 'isolated' | 'initial' | 'medial' | 'final' | 'all';
  playAudio?: boolean;
  highlightDifference?: boolean;
  /** Labels explaining differences between letters */
  comparisonLabels?: {
    targetLabel?: string;
    confusableLabel?: string;
  };
}

/**
 * Drag Hamza to Letter Activity Config
 */
export interface DragHamzaToLetterConfig {
  targetLetter: string;
  correctPosition: HamzaPosition;
  showAllPositions?: boolean;
  distractorPositions?: HamzaPosition[];
}

/**
 * Drag Haraka to Letter Activity Config
 *
 * Students learn Arabic diacritics (harakat) by dragging them onto letters.
 * Two modes:
 * - Single letter: Drag haraka to a specific letter
 * - Multi-letter: Choose the correct letter from scattered options
 */
export interface DragHarakaToLetterConfig {
  /** The diacritic mark to drag (fatha, damma, kasra, sukoon, shadda) */
  harakaType: HarakaType;
  /** The correct letter to place the haraka on */
  targetLetter: string;
  /** Wrong letters to include (enables multi-letter mode when provided) */
  distractorLetters?: string[];
  /** Audio URL to play when haraka is correctly placed */
  correctSoundUrl?: string;
}

/**
 * Slingshot Activity Config
 */
export interface SlingshotConfig {
  targetLetter: string;
  distractorLetters?: string[];
  targetCount?: number;
  letterPositions?: LetterPosition[];
}

/**
 * I Spy Activity Config
 *
 * Find and tap target letters scattered among distractor letters on screen.
 */
export interface ISpyConfig {
  /** Target letter(s) to find */
  targetLetter: string | string[];
  /** Specific letter forms to use for targets */
  targetLetterForms?: string[];
  /** Letter position form */
  letterPosition?: LetterPosition;
  /** Distractor letters (if not provided, random letters are used) */
  distractorLetters?: string[];
  /** How many target letters to find */
  targetCount?: number;
  /** Total letters on screen */
  totalLetters?: number;
  /** Size of displayed letters */
  letterSize?: 'small' | 'medium' | 'large';
}

/**
 * Sound Blend Activity Config
 *
 * Drag slider across Arabic word to blend sounds together.
 * Duration: 1=stop (dot), 2=short (bar), 3=long/madd (big bar)
 */
export interface SoundSegment {
  /** The sound unit (letter + haraka, e.g., "جَ") */
  sound: string;
  /** Duration: 1=stop, 2=short, 3=long */
  duration: SoundDuration;
}

export interface SoundBlendConfig {
  /** Content type: letter or word */
  contentType?: BlendContentType;
  /** The full Arabic word (connected form) */
  word: string;
  /** Sound segments with duration for each letter */
  segments: SoundSegment[];
  /** Reading speed mode: none for letters, slow/fast for words */
  speed?: BlendSpeed;
  /** Number of slides required to complete */
  requiredSlides?: number;
  /** Show both slow (isolated) and fast (connected) sliders side by side */
  showBothSpeeds?: boolean;
  /** Optional transliteration (e.g., "jamal") */
  transliteration?: string;
  /** Optional English meaning (e.g., "camel") */
  meaning?: string;
}

/**
 * Match Pairs Activity Config
 *
 * Draw lines to match items on the left to items on the right.
 * Supports letters, words, and images in any combination.
 */
export type MatchItemType = 'letter' | 'word' | 'image';

export interface MatchItem {
  /** Type of content: letter, word, or image */
  type: MatchItemType;
  /** The content: letter char, word text, or image URL */
  value: string;
  /** Letter identifier (e.g., "ba", "alif") - for letters */
  letterId?: string;
  /** Letter form - for letters */
  form?: LetterPosition;
  /** Optional display label or alt text */
  label?: string;
}

export interface MatchPair {
  /** Item displayed on the left side */
  left: MatchItem;
  /** Item displayed on the right side */
  right: MatchItem;
}

export interface MatchPairsConfig {
  /** The pairs to match (2-4 pairs) */
  pairs: MatchPair[];
  /** Whether to shuffle the right side items */
  shuffleItems?: boolean;
}

/**
 * Letter Reference for selecting letters with forms
 */
export interface LetterReference {
  letterId: string;
  form: LetterPosition;
}

/**
 * Content With Cards Activity Config
 *
 * Displays content (letter, word, or image) at the top with 1-4 cards at the bottom.
 * Supports both interactive (choice) and informational (display-only) modes.
 */
export interface ContentWithCardsOption {
  id: string;
  /** Text content (used for word mode or legacy text) */
  text?: string;
  /** Letter reference with letterId and form (used for letter mode) */
  letter?: LetterReference;
  /** Image URL (used for image mode) */
  image?: string;
  isCorrect?: boolean;
}

export interface ContentWithCardsConfig {
  /** Content to display at top */
  content?: {
    letter?: string;
    word?: string;
    image?: string;
  };
  /** Content type for display */
  contentType?: 'letter' | 'word' | 'image';
  /** Target letter reference (letterId + form) - used when contentType is 'letter' */
  targetLetter?: LetterReference | null;
  /** Array of 1-4 card options */
  cards: ContentWithCardsOption[];
  /** Display mode for cards: letter, word, or image */
  cardMode?: 'letter' | 'word' | 'image';
  /** Whether cards are tappable (interactive) or display-only (informational) */
  interactive?: boolean;
  /** Randomize card order */
  randomizeCards?: boolean;
}

/**
 * Camel Narration Activity Config
 *
 * Camel mascot delivers spoken narration with pose changes.
 * Used for introductions, overviews, and guided explanations.
 */
export type CamelPose = 'idle' | 'eating' | 'celebrating' | 'walkingLeft' | 'walkingRight' | 'clapping' | 'wave' | 'thinking' | 'bored' | 'cartwheel' | 'listening' | 'dancing' | 'confetti';

export interface NarrationStep {
  /** Audio asset ID from the audio library */
  audioId: string;
  /** Audio URL (resolved from audioId) */
  audioUrl?: string;
  /** Camel pose during this step */
  pose?: CamelPose;
  /** Optional subtitle text */
  text?: string;
}

export interface CamelNarrationConfig {
  /** Sequential narration steps */
  narrationSteps: NarrationStep[];
  /** Default pose when not speaking (default: 'idle') */
  defaultPose?: CamelPose;
  /** Show text subtitles (default: false) */
  showSubtitles?: boolean;
  /** Auto-advance through steps (default: true) */
  autoAdvance?: boolean;
}

/**
 * Union type for all activity configs
 */
export type ActivityConfig =
  | ShowLetterOrWordConfig
  | TapLetterInWordConfig
  | TraceLetterConfig
  | PopBalloonsWithLetterConfig
  | BreakTimeMiniGameConfig
  | BuildWordFromLettersConfig
  | MultipleChoiceQuestionConfig
  | DragItemsToTargetConfig
  | CatchFishWithLetterConfig
  | AddPizzaToppingsWithLetterConfig
  | LetterRainConfig
  | AudioLetterMatchConfig
  | MemoryCardMatchConfig
  | ColorLetterConfig
  | LetterDiscriminationConfig
  | ContentWithCardsConfig
  | DragHamzaToLetterConfig
  | DragHarakaToLetterConfig
  | SlingshotConfig
  | ISpyConfig
  | SoundBlendConfig
  | MatchPairsConfig
  | CamelNarrationConfig;

/**
 * Mapped type for activity configs by type
 */
export type ActivityConfigMap = {
  show_letter_or_word: ShowLetterOrWordConfig;
  tap_letter_in_word: TapLetterInWordConfig;
  trace_letter: TraceLetterConfig;
  pop_balloons_with_letter: PopBalloonsWithLetterConfig;
  break_time_minigame: BreakTimeMiniGameConfig;
  build_word_from_letters: BuildWordFromLettersConfig;
  multiple_choice_question: MultipleChoiceQuestionConfig;
  drag_items_to_target: DragItemsToTargetConfig;
  catch_fish_with_letter: CatchFishWithLetterConfig;
  add_pizza_toppings_with_letter: AddPizzaToppingsWithLetterConfig;
  letter_rain: LetterRainConfig;
  audio_letter_match: AudioLetterMatchConfig;
  memory_card_match: MemoryCardMatchConfig;
  color_letter: ColorLetterConfig;
  letter_discrimination: LetterDiscriminationConfig;
  content_with_cards: ContentWithCardsConfig;
  drag_hamza_to_letter: DragHamzaToLetterConfig;
  drag_haraka_to_letter: DragHarakaToLetterConfig;
  slingshot: SlingshotConfig;
  i_spy: ISpyConfig;
  sound_blend: SoundBlendConfig;
  match_pairs: MatchPairsConfig;
  camel_narration: CamelNarrationConfig;
};

/**
 * Get typed config for a specific activity type
 */
export type GetActivityConfig<T extends ArticleType> = T extends keyof ActivityConfigMap
  ? ActivityConfigMap[T]
  : never;
