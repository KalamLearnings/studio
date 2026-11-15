// Form field components
export {
  FormField,
  TextInput,
  TextArea,
  NumberInput,
  Checkbox,
  Select,
} from "./FormField";

// Server save errors beside their fields
export { SaveErrorsProvider, FieldErrors } from "./SaveErrors";

// Mode toggle for text/image switching
export {
  ModeToggle,
  TEXT_IMAGE_MODE_OPTIONS,
  LETTER_WORD_IMAGE_MODE_OPTIONS,
} from "./ModeToggle";
export type { ModeOption } from "./ModeToggle";

// Content display picker (letter/word/image)
export { ContentDisplayPicker } from "./ContentDisplayPicker";
export type { ContentType } from "./ContentDisplayPicker";

// Haraka chooser (vowel tiles + shadda toggle)
export { HarakaChoiceGrid } from "./HarakaChoiceGrid";
export type { HarakaChoiceGridProps } from "./HarakaChoiceGrid";

// Option selector grid (for break types, colors, shapes, etc.)
export { OptionSelector } from "./OptionSelector";

// Options grid variants
export { OptionsGrid, NumberGrid } from "./OptionsGrid";

// Content items (CM-S6): one item, an answer grid of items, the prompt kind
export { ContentItemEditor, CONTENT_KIND_OPTIONS } from "./ContentItemEditor";
export { ContentItemGrid } from "./ContentItemGrid";
export { PromptKindPicker } from "./PromptKindPicker";

// Phrase item (CM-S11): reviewed words in order and the sentence flag
export { PhraseBuilder } from "./PhraseBuilder";

// Letter selector with modal
export { LetterSelector } from "./LetterSelector";

// Word selector with autocomplete
export { WordSelector } from "./WordSelector";

// Word letter picker (pick letter from a word)
export { WordLetterPicker, extractLettersFromWord } from "./WordLetterPicker";

// Image library modal
export { ImageLibraryModal } from "./ImageLibraryModal";

// Animation (Rive) library modal
export { AnimationLibraryModal } from "./AnimationLibraryModal";

// Game speed selector (for balloon, rain, fish, etc.)
export { GameSpeedSelector, DEFAULT_SPEED_OPTIONS } from "./GameSpeedSelector";
export type { SpeedOption } from "./GameSpeedSelector";

// Target letter with distractors form (used by 20+ activities)
export { TargetLetterWithDistractorsForm } from "./TargetLetterWithDistractorsForm";

// UI Components
export { PreviewBox } from "./PreviewBox";
export { SliderWithValue } from "./SliderWithValue";
export { RadioButtonGroup } from "./RadioButtonGroup";
export { AudioPickerField } from "./AudioPickerField";

// Reading types (CM-S12): the v2-only note, client-side problems, library hints
export { V2OnlyNote } from "./V2OnlyNote";
export { FormProblems } from "./FormProblems";
export { useReferenceHints, useCuratedWords } from "./useReferenceHints";
