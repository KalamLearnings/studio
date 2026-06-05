// Form field components
export {
  FormField,
  TextInput,
  TextArea,
  NumberInput,
  Checkbox,
  Select,
} from "./FormField";

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

// Option selector grid (for break types, colors, shapes, etc.)
export { OptionSelector } from "./OptionSelector";

// Option square (single card in grid)
export { OptionSquare } from "./OptionSquare";
export type { OptionSquareData, LetterRef } from "./OptionSquare";

// Options grid variants
export { OptionsGrid, NumberGrid } from "./OptionsGrid";
export { AnswerOptionsGrid } from "./OptionsGridNew";
export type { OptionData } from "./OptionsGridNew";

// Letter selector with modal
export { LetterSelector } from "./LetterSelector";

// Word selector with autocomplete
export { WordSelector } from "./WordSelector";

// Word letter picker (pick letter from a word)
export { WordLetterPicker, extractLettersFromWord } from "./WordLetterPicker";

// Image library modal
export { ImageLibraryModal } from "./ImageLibraryModal";

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
