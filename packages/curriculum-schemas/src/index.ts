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
  // Schemas
  LocalizedTextSchema,
  InstructionSchema,
  ActivityTypeSchema,
  BaseActivitySchema,
  ColorSchema,
  DurationMsSchema,
  DurationSecondsSchema,
  RatioSchema,
  MultiplierSchema,
  ArabicLetterSchema,
  ArabicTextSchema,
  LetterPositionSchema,
  LetterPositionsSchema,
  DifficultySchema,

  // Hamza & Haraka
  HamzaPositionSchema,
  HarakaTypeSchema,
  OptionalHarakaSchema,

  // Letter Reference (unified letter identification)
  LetterIdSchema,
  LetterReferenceSchema,
  LetterReferenceArraySchema,

  // Shape types
  ShapeTypeSchema,

  // Conditional Audio Schemas
  FollowUpActionSchema,
  AudioFollowUpSchema,
  AudioResponseSchema,
  AudioTriggerEventSchema,
  AudioConditionOperatorSchema,
  AudioConditionTargetSchema,
  AudioConditionSchema,
  AudioRuleSchema,
  ConditionalAudioConfigSchema,
  LocalizedTextWithConditionalAudioSchema,

  // Types
  type LocalizedText,
  type Instruction,
  type ActivityType,
  type BaseActivity,
  type LetterPosition,
  type LetterPositions,
  type Difficulty,
  type HamzaPosition,
  type HarakaType,
  type OptionalHaraka,
  type HarakaMeta,
  type HarakaPlacement,
  type HarakaComponent,
  type HarakaBase,
  type LetterId,
  type LetterReference,
  type LetterReferenceArray,
  type ShapeType,

  // Conditional Audio Types
  type FollowUpAction,
  type AudioFollowUp,
  type AudioResponse,
  type AudioTriggerEvent,
  type AudioConditionOperator,
  type AudioConditionTarget,
  type AudioCondition,
  type AudioRule,
  type ConditionalAudioConfig,
  type LocalizedTextWithConditionalAudio,

  // Constants
  ACTIVITY_TYPE_LABELS,
  HARAKA_IDS,
  HARAKA_CHARS,
  HARAKA_META,
} from './base';

// ============================================================================
// HARAKAT (canonical diacritic definitions, shared with backend and mobile)
// ============================================================================

export {
  HARAKA_COMPONENTS,
  HARAKA_COMPONENT_CHARS,
  SIMPLE_HARAKA_IDS,
  SHADDA_HARAKA_IDS,
  ARABIC_MARK_RE,
  TATWEEL,
  isHarakaType,
  isArabicMark,
  applyHaraka,
  stripHarakat,
  harakaComponentsOf,
  harakaFromMarks,
  hasHaraka,
  composeHaraka,
  decomposeHaraka,
  wordLetterUnits,
} from './harakat';

// ============================================================================
// SOUND BLEND (syllable splitter and stored shapes, byte-identical copies of
// the backend's; synced by kalam-readers-backend scripts/sync-blend-word.ts)
// ============================================================================

export {
  BLEND_SPLITTER_VERSION,
  normaliseBlendText,
  pausal,
  checkBlendUnits,
  splitBlendWord,
  type BlendForm,
  type BlendUnitKind,
  type BlendUnitTag,
  type BlendVowel,
  type BlendUnitSpan,
  type BlendUnitOnset,
  type BlendUnitCoda,
  type BlendUnit,
  type BlendIssueCode,
  type BlendIssueSeverity,
  type BlendIssue,
  type BlendLetter,
  type BlendDraftUnit,
  type BlendSplit,
} from './blend-word';

// The contract's inferred types share names with the splitter's types above and
// describe the same shapes, so only the schemas and PhaseMark are exported here.
export {
  BlendFormSchema,
  BlendUnitKindSchema,
  BlendUnitTagSchema,
  BlendVowelSchema,
  BlendUnitSpanSchema,
  BlendUnitSchema,
  BlendUnitsSchema,
  PhaseMarkSchema,
  blendMarksSchema,
  type PhaseMark,
} from './blend';

// ============================================================================
// WORD SPELLING (content model CM-B2: the normalised text that identifies one
// curriculum_words row; a byte-identical copy of the backend's
// core/domain/words/spelling.ts, kept so by test/spelling-drift.test.ts)
// ============================================================================

export {
  normaliseSpelling,
  spellingKey,
  type SpellingIssueCode,
  type SpellingIssue,
  type SpellingResult,
} from './spelling';

// ============================================================================
// CONTENT MODEL VOCABULARIES (CM-B3, CM-B19: rule ids, skill kinds, contrast
// tags, the skill graph and teaching sequences; byte-identical copies of the
// backend's core/domain/content-model/, synced by kalam-readers-backend
// scripts/sync-content-model.ts and kept so by test/content-model-drift.test.ts.
// The curriculum lead reviews them (CM-C7).)
// =====================================================================
// ============================================================================

export {
  RULE_IDS,
  RULE_META,
  isRuleId,
  ruleKey,
  rulesFromUnits,
  type RuleId,
  type RuleSource,
  type RuleMeta,
  type RuleUnit,
} from './rules';

export {
  STRANDS,
  SKILL_KINDS,
  SKILL_KIND_META,
  RESPONSE_TYPES,
  ACTIVITY_SKILL_MAP,
  DISCRIMINATE_CONTRASTS,
  isSkillKind,
  isResponseType,
  skillKey,
  parseSkillKey,
  activitySkills,
  type Strand,
  type SkillKind,
  type SkillKindMeta,
  type ResponseType,
  type ActivityEvidence,
  type ActivitySkillEntry,
} from './skills';

export {
  CONTRAST_IDS,
  CONTRAST_META,
  DOT_GROUPS,
  SUN_LETTER_IDS,
  isContrastId,
  deriveContrast,
  type ContrastId,
  type ContrastRef,
  type ContrastContext,
} from './contrast';

export {
  UNIT_KEY_NAMESPACES,
  SKILL_LINK_TYPES,
  SKILL_LINKS,
  isValidUnitKey,
  isValidKeyPattern,
  namespaceOf,
  matchKeyPattern,
  substituteKeyPattern,
  linksInto,
  linksFrom,
  prerequisitesOf,
  stagesOf,
  expandLinks,
  sequenceViolations,
  findPrerequisiteCycle,
  type UnitKeyNamespace,
  type KeyBindings,
  type SkillLinkType,
  type SkillLink,
  type ConcreteLink,
  type SequenceViolation,
} from './skill_graph';

export {
  STAGE_LABELS,
  DEFAULT_SEQUENCE_ID,
  TEACHING_SEQUENCES,
  isStageLabel,
  stagePosition,
  type StageLabel,
  type TeachingSequence,
} from './teaching_sequences';
=======
// MADD (content model D7, CM-B4: long vowel on a letter reference; a
// byte-identical copy of the backend's curriculum-schemas/madd.ts, kept so by
// test/madd-drift.test.ts)
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
} from './madd';

// ============================================================================
// ACTIVITY SCHEMAS & TYPES
// ============================================================================

export {
  // Union schema
  ActivitySchema,
  type Activity,

  // Helper functions
  getActivityConfigSchema,
  getAllActivityConfigSchemas,

  // Show Letter or Word
  ShowLetterOrWordConfigSchema,
  ShowLetterOrWordActivitySchema,
  type ShowLetterOrWordConfig,
  type ShowLetterOrWordActivity,

  // Tap Letter in Word
  TapLetterInWordConfigSchema,
  TapLetterInWordActivitySchema,
  type TapLetterInWordConfig,
  type TapLetterInWordActivity,

  // Trace Letter
  TraceLetterConfigSchema,
  TraceLetterActivitySchema,
  type TraceLetterConfig,
  type TraceLetterActivity,

  // Pop Balloons with Letter
  PopBalloonsWithLetterConfigSchema,
  PopBalloonsWithLetterActivitySchema,
  type PopBalloonsWithLetterConfig,
  type PopBalloonsWithLetterActivity,

  // Break Time Mini-Game
  BreakTimeMiniGameConfigSchema,
  BreakTimeMiniGameActivitySchema,
  type BreakTimeMiniGameConfig,
  type BreakTimeMiniGameActivity,

  // Build Word from Letters
  BuildWordFromLettersConfigSchema,
  BuildWordFromLettersActivitySchema,
  type BuildWordFromLettersConfig,
  type BuildWordFromLettersActivity,

  // Multiple Choice Question
  MultipleChoiceOptionSchema,
  MultipleChoiceQuestionConfigSchema,
  MultipleChoiceQuestionActivitySchema,
  type MultipleChoiceOption,
  type MultipleChoiceQuestionConfig,
  type MultipleChoiceQuestionActivity,

  // Drag Items to Target
  DraggableItemSchema,
  DragItemsToTargetConfigSchema,
  DragItemsToTargetActivitySchema,
  type DraggableItem,
  type DragItemsToTargetConfig,
  type DragItemsToTargetActivity,

  // Catch Fish with Letter
  CatchFishWithLetterConfigSchema,
  CatchFishWithLetterActivitySchema,
  type CatchFishWithLetterConfig,
  type CatchFishWithLetterActivity,

  // Add Pizza Toppings with Letter
  PizzaToppingSchema,
  AddPizzaToppingsWithLetterConfigSchema,
  AddPizzaToppingsWithLetterActivitySchema,
  type PizzaTopping,
  type AddPizzaToppingsWithLetterConfig,
  type AddPizzaToppingsWithLetterActivity,

  // Drag Dots to Letter
  DragDotsToLetterConfigSchema,
  DragDotsToLetterActivitySchema,
  type DragDotsToLetterConfig,
  type DragDotsToLetterActivity,

  // Tap Dot Position
  TapDotPositionConfigSchema,
  TapDotPositionActivitySchema,
  type TapDotPositionConfig,
  type TapDotPositionActivity,

  // Activity Request
  ActivityRequestConfigSchema,
  ActivityRequestActivitySchema,
  type ActivityRequestConfig,
  type ActivityRequestActivity,

  // Shared constants
  SUPPORTED_DOTTED_LETTERS,
} from './activities/index';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export {
  // Validation helpers
  safeValidate,
  validateOrThrow,
  type ValidationResult,
  type ValidationError,

  // Activity helpers
  isValidActivityType,
  getActivityCategory,
  getEstimatedDuration,

  // Data transformation
  stripEmpty,
  deepMerge,
  createDefaultConfig,

  // Letter reference helpers
  isLetterReference,
  isLetterReferenceArray,
  createLetterReference,
  normalizeToLetterReference,
  letterReferencesEqual,
  getLetterReferenceKey,
  parseLetterReferenceKey,
} from './utils';
