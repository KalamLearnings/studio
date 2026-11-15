/**
 * @kalam/curriculum-schemas
 *
 * Unified Zod schemas for Kalam Kids curriculum activities.
 * Single source of truth across dashboard, backend, and mobile app.
 *
 * @packageDocumentation
 */

// ============================================================================
// BASE SCHEMAS & TYPES
// ============================================================================

export {
  // Constants
  ACTIVITY_TYPE_LABELS,
  type ActivityType,
  ActivityTypeSchema,
  ArabicLetterSchema,
  ArabicTextSchema,
  type BaseActivity,
  BaseActivitySchema,
  ColorSchema,
  type Difficulty,
  DifficultySchema,
  DurationMsSchema,
  DurationSecondsSchema,
  type HarakaType,
  HarakaTypeSchema,
  type Instruction,
  InstructionSchema,
  type LetterId,
  LetterIdSchema,
  type LetterPosition,
  LetterPositionSchema,
  type LetterReference,
  type LetterReferenceArray,
  LetterReferenceArraySchema,
  LetterReferenceSchema,
  // Types
  type LocalizedText,
  // Schemas
  LocalizedTextSchema,
  MultiplierSchema,
  type OptionalHaraka,
  OptionalHarakaSchema,
  RatioSchema,
} from './base.ts';

// ============================================================================
// HARAKAT (diacritic ids, characters, display metadata, helpers)
// ============================================================================

export {
  applyHaraka,
  composeHaraka,
  decomposeHaraka,
  HARAKA_CHARS,
  HARAKA_COMPONENT_CHARS,
  HARAKA_COMPONENTS,
  HARAKA_IDS,
  HARAKA_META,
  type HarakaBase,
  type HarakaComponent,
  harakaComponentsOf,
  harakaFromMarks,
  type HarakaMeta,
  type HarakaPlacement,
  hasHaraka,
  isArabicMark,
  isHarakaType,
  SHADDA_HARAKA_IDS,
  SIMPLE_HARAKA_IDS,
  stripHarakat,
  TATWEEL,
  wordLetterUnits,
} from './harakat.ts';

// ============================================================================
// MADD (long vowel on a letter reference, D7)
// ============================================================================

export {
  isMaddHaraka,
  isValidMadd,
  MADD_CARRIER_BY_HARAKA,
  MADD_HARAKA_IDS,
  MADD_NEEDS_SHORT_VOWEL,
  MADD_RULE_BY_HARAKA,
  MADD_VARIANT_BY_HARAKA,
  type MaddHaraka,
} from './madd.ts';

// ============================================================================
// ACTIVITY SCHEMAS & TYPES
// ============================================================================

export {
  type Activity,
  // Union schema
  ActivitySchema,
  type AddPizzaToppingsWithLetterActivity,
  AddPizzaToppingsWithLetterActivitySchema,
  type AddPizzaToppingsWithLetterConfig,
  AddPizzaToppingsWithLetterConfigSchema,
  type BreakTimeMiniGameActivity,
  BreakTimeMiniGameActivitySchema,
  type BreakTimeMiniGameConfig,
  // Break Time Mini-Game
  BreakTimeMiniGameConfigSchema,
  type BuildWordFromLettersActivity,
  BuildWordFromLettersActivitySchema,
  type BuildWordFromLettersConfig,
  // Build Word from Letters
  BuildWordFromLettersConfigSchema,
  type CatchFishWithLetterActivity,
  CatchFishWithLetterActivitySchema,
  type CatchFishWithLetterConfig,
  // Catch Fish with Letter
  CatchFishWithLetterConfigSchema,
  type DraggableItem,
  // Drag Items to Target
  DraggableItemSchema,
  type DragItemsToTargetActivity,
  DragItemsToTargetActivitySchema,
  type DragItemsToTargetConfig,
  DragItemsToTargetConfigSchema,
  // Helper functions
  getActivityConfigSchema,
  getAllActivityConfigSchemas,
  type LetterRainActivity,
  LetterRainActivitySchema,
  type LetterRainConfig,
  // Letter Rain
  LetterRainConfigSchema,
  type MultipleChoiceOption,
  // Multiple Choice Question
  MultipleChoiceOptionSchema,
  type MultipleChoiceQuestionActivity,
  MultipleChoiceQuestionActivitySchema,
  type MultipleChoiceQuestionConfig,
  MultipleChoiceQuestionConfigSchema,
  type PizzaTopping,
  // Add Pizza Toppings with Letter
  PizzaToppingSchema,
  type PopBalloonsWithLetterActivity,
  PopBalloonsWithLetterActivitySchema,
  type PopBalloonsWithLetterConfig,
  // Pop Balloons with Letter
  PopBalloonsWithLetterConfigSchema,
  type ShowLetterOrWordActivity,
  ShowLetterOrWordActivitySchema,
  type ShowLetterOrWordConfig,
  // Show Letter or Word
  ShowLetterOrWordConfigSchema,
  type TapLetterInWordActivity,
  TapLetterInWordActivitySchema,
  type TapLetterInWordConfig,
  // Tap Letter in Word
  TapLetterInWordConfigSchema,
  type TraceLetterActivity,
  TraceLetterActivitySchema,
  type TraceLetterConfig,
  // Trace Letter
  TraceLetterConfigSchema,
} from './activities/index.ts';

// ============================================================================
// WRITE AND READ SCHEMAS (CM-B7)
// ============================================================================

export {
  ActivityRequestConfigSchema,
  ActivityRequestReadSchema,
  CamelNarrationConfigSchema,
  CamelNarrationReadSchema,
  ContentWithCardsConfigSchema,
  ContentWithCardsReadSchema,
  DragDotsToLetterConfigSchema,
  DragDotsToLetterReadSchema,
  getActivityReadSchema,
  LEGACY_WRITE_SCHEMA_TYPES,
  readActivityConfig,
  type ReadActivityConfigResult,
  SpeechPracticeConfigSchema,
  SpeechPracticeReadSchema,
  TapDotPositionConfigSchema,
  TapDotPositionReadSchema,
  TargetWithDistractorsConfigSchema,
  THEMED_LETTER_HUNT_CONFIG_SCHEMAS,
  THEMED_LETTER_HUNT_TYPES,
  ThemedLetterHuntReadSchema,
} from './activities/index.ts';

export {
  AssetRefWriteSchema,
  ConditionalAudioSchema,
  CONTENT_KINDS,
  type ContentItemWrite,
  ContentItemWriteSchema,
  type ContentKind,
  type ContentRefWrite,
  ContentRefWriteSchema,
  LetterRefWriteSchema,
  NumeralWriteSchema,
  PROMPT_KINDS,
  type PromptKind,
  type PromptWrite,
  PromptWriteSchema,
  readContentText,
  readLetterGlyph,
  readLetterRef,
  readNumeral,
  TargetLetterWriteSchema,
  WordRefWriteSchema,
} from './references.ts';

export { LETTER_IDS, letterIdOfGlyph } from './letter-glyphs.ts';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export {
  createDefaultConfig,
  deepMerge,
  getActivityCategory,
  getEstimatedDuration,
  // Activity helpers
  isValidActivityType,
  // Validation helpers
  safeValidate,
  // Data transformation
  stripEmpty,
  validateOrThrow,
  type ValidationError,
  type ValidationResult,
} from './utils.ts';
