# Changelog

All notable changes to @kalam/curriculum-schemas will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-21

### Added

#### Core Schemas
- Base schemas for all curriculum activities
- `LocalizedTextSchema` for bilingual content (English & Arabic)
- `ActivityTypeSchema` enum with 10 activity types
- `BaseActivitySchema` for common activity fields
- Helper schemas: `ColorSchema`, `DurationMsSchema`, `DurationSecondsSchema`, `RatioSchema`, `MultiplierSchema`
- Arabic-specific schemas: `ArabicLetterSchema`, `ArabicTextSchema`, `LetterPositionSchema`

#### Activity Schemas (10 Total)
1. **show_letter_or_word** - Display single letter or word with animations
2. **tap_letter_in_word** - Tap target letters within a word
3. **trace_letter** - Guided letter tracing with validation
4. **pop_balloons_with_letter** - Game-based letter recognition
5. **break_time_minigame** - Mental break activities (4 variants)
6. **build_word_from_letters** - Drag letters to build words (consolidates old name_builder and word_builder)
7. **multiple_choice_question** - MCQ activities with flexible options
8. **drag_items_to_target** - Drag-and-drop activities (3 variants)
9. **catch_fish_with_letter** - Fishing game for letter recognition
10. **add_pizza_toppings_with_letter** - Creative pizza-making activity

#### Utility Functions
- `safeValidate()` - Safe validation with user-friendly errors
- `validateOrThrow()` - Validate and throw on error
- `isValidActivityType()` - Type guard for activity types
- `getActivityCategory()` - Get category for UI grouping
- `getEstimated Duration()` - Get default duration estimates
- `stripEmpty()` - Remove undefined/null from objects
- `deepMerge()` - Deep merge configuration objects
- `createDefaultConfig()` - Create valid default configs

#### Type Exports
- Discriminated union type `Activity` for type-safe handling
- Individual activity config types (e.g., `TapLetterInWordConfig`)
- Individual activity types (e.g., `TapLetterInWordActivity`)
- Helper types: `ValidationResult`, `ValidationError`, `LocalizedText`

#### Documentation
- Comprehensive README with installation and usage
- EXAMPLES.md with real-world usage patterns
- JSDoc comments on all schemas and functions
- TypeScript declaration files (.d.ts) for full IntelliSense

### Changed
- **BREAKING**: Consolidated `name_builder` and `word_builder` into single `build_word_from_letters` activity
- **BREAKING**: Renamed all activity types to be descriptive:
  - `intro` → `show_letter_or_word`
  - `presentation` → `show_letter_or_word`
  - `tap` → `tap_letter_in_word`
  - `write` → `trace_letter`
  - `balloon` → `pop_balloons_with_letter`
  - `break` → `break_time_minigame`
  - `multiple_choice` → `multiple_choice_question`
  - `drag_drop` → `drag_items_to_target`
  - `fishing` → `catch_fish_with_letter`
  - `pizza` → `add_pizza_toppings_with_letter`

### Architecture
- Modular schema design with one file per activity
- Centralized exports through index files
- Discriminated union for type narrowing
- Reusable helper schemas for common patterns
- Full TypeScript support with strict mode

### Notes
- This is the initial release - first unified schema across all platforms
- Designed to work with Dashboard (Next.js), Backend (Supabase), and Mobile App (React Native)
- All schemas include validation, documentation, and type safety
