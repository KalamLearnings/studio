import { z } from 'zod';
import {
  ActivityTypeSchema,
  type ActivityType,
  TapLetterInWordConfigSchema,
  ShowLetterOrWordConfigSchema,
  TraceLetterConfigSchema,
  PopBalloonsWithLetterConfigSchema,
  BreakTimeMiniGameConfigSchema,
  BuildWordFromLettersConfigSchema,
  MultipleChoiceQuestionConfigSchema,
  DragItemsToTargetConfigSchema,
  CatchFishWithLetterConfigSchema,
  AddPizzaToppingsWithLetterConfigSchema,
} from '@kalam/curriculum-schemas';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

// Localized text schema - Arabic text is optional, only English required.
// Used for titles/names where text is always required.
export const LocalizedTextSchema = z.object({
  en: z.string().min(1, 'English text required'),
  ar: z.string().optional(),
  audio_url: z.string().optional(),
});

// Instruction schema - like LocalizedText but the English text is OPTIONAL.
// Not every activity needs a spoken instruction; making it required previously
// forced creators to type placeholder text just to save. When `en` is present,
// audio can be auto-generated on save.
export const InstructionSchema = z.object({
  en: z.string().optional(),
  ar: z.string().optional(),
  // Server-controlled: the backend owns instruction-audio generation and writes
  // this on save. Clients send intent (text + voiceId) and never an audio_url.
  audio_url: z.string().optional(),
  // The chosen TTS voice. Sent by the client as part of the instruction intent;
  // the backend uses it when generating audio.
  voiceId: z.string().optional(),
});

export const LetterSchema = z.object({
  id: z.string().optional(),
  letter: z.string().length(1, 'Must be a single Arabic letter'),
  name_english: z.string().min(1, 'Letter name (English) required'),
  name_arabic: z.string().optional(),
  letter_sound: z.string().optional(),
});

// Use shared ActivityTypeSchema
export const ArticleTypeSchema = ActivityTypeSchema;

// ============================================================================
// CURRICULUM
// ============================================================================

export const CurriculumSchema = z.object({
  id: z.string().uuid(),
  title: LocalizedTextSchema,
  is_published: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateCurriculumSchema = z.object({
  title: LocalizedTextSchema,
});

// Publishing is a field update, not a dedicated endpoint — `is_published` has
// to be updatable here the way it is for topics/nodes/articles.
export const UpdateCurriculumSchema = CreateCurriculumSchema.partial().extend({
  is_published: z.boolean().optional(),
});

// ============================================================================
// TOPIC
// ============================================================================

export const TopicSchema = z.object({
  id: z.string().uuid(),
  curriculum_id: z.string().uuid(),
  letter: LetterSchema.optional().nullable(),
  sequence_number: z.number().int().positive(),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  is_published: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const TopicTypeSchema = z.enum(['lesson', 'review', 'quiz', 'assessment']);

export const LetterFormSchema = z.enum(['isolated', 'initial', 'medial', 'final']);

export const LetterHarakaSchema = z.enum(['fatha', 'damma', 'kasra', 'sukoon', 'shadda']);

export const CreateTopicSchema = z.object({
  letter_id: z.string().optional(), // Letter ID reference (e.g., "jeem", "alif")
  letter_form: LetterFormSchema.optional(), // Which form of the letter (isolated, initial, medial, final)
  letter_haraka: LetterHarakaSchema.optional(), // Optional diacritic for the topic letter
  // NOTE: sequence_number is intentionally NOT part of create. The backend
  // assigns the next number from the DB max (curriculum service.ts). A
  // client-computed value (length+1) collides with the
  // curriculum_id/sequence_number unique constraint when the list has gaps from
  // deletions. Ordering is owned by the reorder endpoint, not create.
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  type: TopicTypeSchema.optional().default('lesson'),
});

export const UpdateTopicSchema = CreateTopicSchema.extend({
  is_published: z.boolean().optional(),
}).partial();

// ============================================================================
// NODE (formerly "Node" - keeping backend naming)
// ============================================================================

export const NodeSchema = z.object({
  id: z.string().uuid(),
  topic_id: z.string().uuid(),
  sequence_number: z.number().int().positive(),
  type: z.enum(['lesson', 'assessment', 'intro']).default('lesson'),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  is_published: z.boolean().default(true),
  position: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateNodeSchema = z.object({
  // sequence_number intentionally omitted — backend assigns max+1. See CreateTopicSchema.
  type: z.enum(['lesson', 'assessment', 'intro']).default('lesson'),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  position: z.object({
    x: z.number().min(0).max(1).default(0.5),
    y: z.number().min(0).max(1).default(0.5),
  }).optional(),
});

export const UpdateNodeSchema = CreateNodeSchema.extend({
  is_published: z.boolean().optional(),
}).partial();

// ============================================================================
// ACTIVITY TEMPLATE
// ============================================================================

export const ActivityTemplateSchema = z.object({
  id: z.string(),
  name: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  type: ArticleTypeSchema,
  preset_id: z.string().optional(),
  instruction_template: LocalizedTextSchema,
  config_template: z.record(z.any()),
  required_fields: z.array(z.string()),
  optional_fields: z.record(z.any()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  usage_count: z.number().int().nonnegative().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateActivityTemplateSchema = z.object({
  id: z.string().optional(), // Auto-generated from name if not provided
  name: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  type: ArticleTypeSchema,
  preset_id: z.string().optional(),
  instruction_template: LocalizedTextSchema,
  config_template: z.record(z.any()),
  required_fields: z.array(z.string()).default([]), // Auto-inferred from placeholders
  optional_fields: z.record(z.any()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const UpdateActivityTemplateSchema = CreateActivityTemplateSchema.partial().omit({ id: true });

export const InstantiateTemplateSchema = z.object({
  template_id: z.string(),
  variables: z.record(z.any()),
  node_id: z.string().optional(),
});

// ============================================================================
// ARTICLE (formerly "Activity")
// ============================================================================

// Use shared config schemas for validation
export const ArticleConfigSchema = z.union([
  ShowLetterOrWordConfigSchema,
  TapLetterInWordConfigSchema,
  TraceLetterConfigSchema,
  PopBalloonsWithLetterConfigSchema,
  BreakTimeMiniGameConfigSchema,
  BuildWordFromLettersConfigSchema,
  MultipleChoiceQuestionConfigSchema,
  DragItemsToTargetConfigSchema,
  CatchFishWithLetterConfigSchema,
  AddPizzaToppingsWithLetterConfigSchema,
  z.object({}), // Empty config fallback for partial data
]);

export const ArticleSchema = z.object({
  id: z.string().uuid(),
  node_id: z.string().uuid(),
  sequence_number: z.number().int().positive(),
  type: ArticleTypeSchema,
  instruction: InstructionSchema,
  config: ArticleConfigSchema,
  is_published: z.boolean().default(true),
  template_id: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateArticleSchema = z.object({
  type: ArticleTypeSchema,
  instruction: InstructionSchema,
  config: ArticleConfigSchema,
  template_id: z.string().optional(),
  sequence_number: z.number().int().positive().optional(),
  // Request-only flag: ask the backend to (re)generate instruction audio. The
  // backend always generates on create, so it is only meaningful on update.
  regenerateAudio: z.boolean().optional(),
});

export const UpdateArticleSchema = CreateArticleSchema.extend({
  is_published: z.boolean().optional(),
}).partial();

// ============================================================================
// REORDER SCHEMAS
// ============================================================================

export const ReorderItemSchema = z.object({
  id: z.string().uuid(),
  sequence_number: z.number().int().positive(),
});

export const BatchReorderSchema = z.object({
  items: z.array(ReorderItemSchema).min(1),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Curriculum = z.infer<typeof CurriculumSchema>;
export type CreateCurriculum = z.infer<typeof CreateCurriculumSchema>;
export type UpdateCurriculum = z.infer<typeof UpdateCurriculumSchema>;

export type Topic = z.infer<typeof TopicSchema>;
export type CreateTopic = z.infer<typeof CreateTopicSchema>;
export type UpdateTopic = z.infer<typeof UpdateTopicSchema>;
export type TopicType = z.infer<typeof TopicTypeSchema>;

export type Node = z.infer<typeof NodeSchema>;
export type CreateNode = z.infer<typeof CreateNodeSchema>;
export type UpdateNode = z.infer<typeof UpdateNodeSchema>;

export type ActivityTemplate = z.infer<typeof ActivityTemplateSchema>;
export type CreateActivityTemplate = z.infer<typeof CreateActivityTemplateSchema>;
export type UpdateActivityTemplate = z.infer<typeof UpdateActivityTemplateSchema>;
export type InstantiateTemplate = z.infer<typeof InstantiateTemplateSchema>;

export type Article = z.infer<typeof ArticleSchema>;
export type CreateArticle = z.infer<typeof CreateArticleSchema>;
export type UpdateArticle = z.infer<typeof UpdateArticleSchema>;
// Re-export shared ActivityType as ArticleType for backward compatibility
export type ArticleType = ActivityType;

export type ReorderItem = z.infer<typeof ReorderItemSchema>;
export type BatchReorder = z.infer<typeof BatchReorderSchema>;
