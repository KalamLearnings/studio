/**
 * Base types for activity form components
 *
 * Re-exports types from @kalam/curriculum-schemas for consistency
 */

// Import for local use AND re-export
import type {
  LetterReference as LetterReferenceType,
  LetterReferenceArray as LetterReferenceArrayType,
  LetterPosition as LetterPositionType,
  LetterId as LetterIdType,
  HarakaType as HarakaTypeType,
  OptionalHaraka as OptionalHarakaType,
  HamzaPosition as HamzaPositionType,
  ShapeType as ShapeTypeType,
  ActivityType as ActivityTypeType,
} from "@kalam/curriculum-schemas";

// Re-export types for consumers
export type LetterReference = LetterReferenceType;
export type LetterReferenceArray = LetterReferenceArrayType;
export type LetterPosition = LetterPositionType;
export type LetterId = LetterIdType;
export type HarakaType = HarakaTypeType;
export type OptionalHaraka = OptionalHarakaType;
export type HamzaPosition = HamzaPositionType;
export type ShapeType = ShapeTypeType;
export type ActivityType = ActivityTypeType;

// Re-export constants
export { HARAKA_CHARS, HARAKA_META } from "@kalam/curriculum-schemas";

// Re-export utility functions
export {
  isLetterReference,
  isLetterReferenceArray,
  createLetterReference,
  normalizeToLetterReference,
  letterReferencesEqual,
  getLetterReferenceKey,
  parseLetterReferenceKey,
} from "@kalam/curriculum-schemas";

// ============================================================================
// LOCAL TYPES (not in schema package)
// ============================================================================

// Generic activity config type - forms cast to specific types as needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActivityConfig = Record<string, any>;

// Topic context for auto-populating fields
// Compatible with the Topic type from the API
export interface TopicContext {
  id: string;
  title: {
    en: string;
    ar?: string;
    audio_url?: string;
  };
  letter?: {
    id?: string;
    letter: string;
    name_english: string;
    name_arabic?: string;
    letter_sound?: string;
    forms?: {
      isolated?: string;
      initial?: string;
      medial?: string;
      final?: string;
    };
  } | null;
}

// Base props interface for all activity form components
export interface BaseActivityFormProps<T extends ActivityConfig = ActivityConfig> {
  /** The activity configuration object */
  config: T;
  /** Callback when config changes */
  onChange: (config: T) => void;
  /** Optional topic data for auto-populating fields */
  topic?: TopicContext | null;
}

// Alias for backward compatibility
export type LetterForm = LetterPosition;

// Break activity variant types
export type BreakVariant =
  | "tracing_lines"
  | "dot_tapping"
  | "coloring"
  | "memory_game"
  | "tap_shapes";

// Break activity config
export interface BreakTimeMiniGameConfig extends ActivityConfig {
  variant?: BreakVariant;
  duration?: number;
  color?: string;
  linePattern?: string;
  cardCount?: number;
  targetShape?: ShapeType;
  targetCount?: number;
  totalShapes?: number;
}

// Intro activity config
export interface IntroActivityConfig extends ActivityConfig {
  contentType?: "letter" | "word" | "image";
  targetLetter?: LetterReference | null;
  word?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
}

// Animation intro activity config (Rive animation + instruction audio)
export interface AnimationIntroConfig extends ActivityConfig {
  /** Public URL of a Rive (.riv) file in the curriculum-animations bucket */
  animationUrl?: string;
  /** Loop the animation while the activity is on screen (default true) */
  loop?: boolean;
}

// Write/Trace activity config
export interface WriteActivityConfig extends ActivityConfig {
  targetLetter?: LetterReference | null;
  mode?: "guided" | "freehand";
  traceCount?: number;
}

// Tap letter in word config
// Matching is position-based: `targetIndices` lists the logical letter positions
// the child must tap (each uniquely pins letter + haraka + form + occurrence).
// `targetLetter` is retained for display/audio; `targetLetterIndex` is a legacy
// single-index hint, superseded by `targetIndices`.
export interface TapActivityConfig extends ActivityConfig {
  targetWord?: string;
  targetLetter?: string | LetterReference;
  targetIndices?: number[];
  /** @deprecated legacy single-index UI hint; use targetIndices */
  targetLetterIndex?: number;
  targetCount?: number;
  wordMeaning?: string;
}

// Target letter with distractors config (used by many activities)
export interface TargetLetterConfig extends ActivityConfig {
  targetLetter?: LetterReference | LetterReference[] | null;
  distractorLetters?: LetterReference[];
  letterPositions?: LetterPosition[];
  targetCount?: number;
  duration?: number;
}
