# V2 Dashboard Implementation Guide

This document captures the analysis and implementation plan for rebuilding the Kalam Kids curriculum dashboard. A future Claude session should use this to continue implementation.

## Project Context

**Goal**: Rebuild the curriculum dashboard (v2) with clean architecture, fixing the bugs and inconsistencies from the original dashboard.

**Repositories**:
- Original dashboard: `/Users/salehqadan/Projects/KalamKids/kalam-curriculum-dashboard/`
- New v2 dashboard: `/Users/salehqadan/Projects/KalamKids/kalam-dashboard-v2/`
- Backend: `/Users/salehqadan/Projects/KalamKids/kalam-readers-backend/`

**Tech Stack**:
- Next.js 14 with App Router
- React, TypeScript, TailwindCSS
- Supabase (PostgreSQL + Edge Functions)
- Zod for validation
- `@kalam/curriculum-schemas` local package for shared types

---

## Completed Work

### 1. LetterReference Schema (DONE)

We added a unified `LetterReferenceSchema` to both backend and v2 dashboard schema packages.

**Location**: 
- Backend: `kalam-readers-backend/supabase/functions/_shared/curriculum-schemas/base.ts`
- V2: `kalam-dashboard-v2/packages/curriculum-schemas/src/base.ts`

**Schema Definition**:
```typescript
export const LetterReferenceSchema = z.object({
  letterId: LetterIdSchema,        // e.g., 'ba', 'alif', 'jeem'
  form: LetterPositionSchema,      // 'isolated' | 'initial' | 'medial' | 'final'
  haraka: OptionalHarakaSchema.optional(), // 'none' | 'fatha' | 'damma' | 'kasra' | 'sukoon' | 'shadda'
});
```

**Related Types Added**:
- `LetterIdSchema` - validates letter IDs
- `HarakaTypeSchema` - diacritic types
- `OptionalHarakaSchema` - includes 'none' option
- `LetterReferenceArraySchema` - array of references
- `HARAKA_META` - UI metadata for harakat display

**Utility Functions Added** (in `utils.ts`):
- `isLetterReference()` - type guard
- `isLetterReferenceArray()` - type guard
- `createLetterReference()` - factory function
- `normalizeToLetterReference()` - string/ref → ref
- `letterReferencesEqual()` - comparison
- `getLetterReferenceKey()` - unique key for Maps/React
- `parseLetterReferenceKey()` - reverse of above

### 2. Backend Activity Schemas Updated (DONE)

All activity schemas in `kalam-readers-backend/supabase/functions/_shared/curriculum-schemas/activities/` now use `LetterReferenceSchema` instead of `ArabicLetterSchema` for letter fields.

**Updated schemas**:
- show_letter_or_word.ts
- tap_letter_in_word.ts
- trace_letter.ts
- color_letter.ts
- pop_balloons_with_letter.ts
- catch_fish_with_letter.ts
- letter_rain.ts
- i_spy.ts
- drag_haraka_to_letter.ts
- drag_hamza_to_letter.ts
- add_pizza_toppings_with_letter.ts
- memory_card_match.ts
- audio_letter_match.ts
- letter_discrimination.ts
- slingshot.ts
- match_pairs.ts

### 3. V2 Dashboard Types Updated (PARTIAL)

The types file at `kalam-dashboard-v2/components/builder/forms/types.ts` was updated to import from `@kalam/curriculum-schemas`.

**Issue Found**: The v2 schema package has fewer activity types than the backend. Need to sync.

---

## Remaining Work

### Priority 1: Sync ActivityType Between Packages

The v2 schema package is missing these activity types that exist in the backend:

```typescript
// Missing from v2 schema:
'speech_practice',
'grid_tap',
'pick_from_tree',
'pick_flowers',
'tap_crescent_moons',
'drag_to_animal_mouth',
'feed_rabbit',
'feed_baby',
'piggy_bank',
'snowflakes',
'bear_honey',
'fly_on_flowers',
'deliver_envelope',
'plant_seeds',
'balance_scale',
'ice_cream_stacking',
'drag_hamza_to_letter',
'drag_haraka_to_letter',
'slingshot',
'match_pairs',
```

**Action**: Update `kalam-dashboard-v2/packages/curriculum-schemas/src/base.ts`:
1. Add missing activity types to `ActivityTypeSchema`
2. Add labels to `ACTIVITY_TYPE_LABELS`

### Priority 2: Fix TypeScript Errors

After syncing types, fix remaining TS errors:

1. **LetterForm vs LetterPosition**: Some components use `LetterForm` which was an alias. Update to use `LetterPosition` consistently.

2. **forms index access**: Several files have errors like `Element implicitly has an 'any' type because expression of type 'any' can't be used to index type 'LetterForm'`. Fix by properly typing the letter data.

3. **TopicContext mismatch**: The builder page passes a topic object that doesn't match `TopicContext` interface. Need to either:
   - Update `TopicContext` to match what's actually passed
   - Transform the data before passing

### Priority 3: Review and Fix Activity Forms

Current form status (by line count - higher = more complete):

| Form | Lines | Status |
|------|-------|--------|
| SoundBlendActivityForm | 456 | Likely complete |
| MatchPairsActivityForm | 426 | Likely complete |
| ContentWithCardsActivityForm | 391 | Likely complete |
| MemoryCardMatchActivityForm | 250 | Needs review |
| BreakActivityForm | 224 | Needs review |
| IntroActivityForm | 218 | Needs review |
| DragHarakaToLetterForm | 213 | Needs review |
| TapActivityForm | 206 | Needs review |
| MultipleChoiceActivityForm | 189 | Needs review |
| SpeechPracticeActivityForm | 175 | Needs review |
| WriteActivityForm | 118 | Needs review |
| DragHamzaToLetterForm | 117 | Needs review |
| DragDropActivityForm | 112 | Needs review |
| ISpyActivityForm | 108 | Needs review |
| BuildWordFromLettersForm | 102 | Needs review |
| DragDotsToLetterForm | 99 | Needs review |
| ActivityRequestForm | 90 | Simple, likely done |
| CamelNarrationActivityForm | 64 | Simple, likely done |
| ColorLetterActivityForm | 52 | Needs review |
| GenericActivityForm | 18 | Fallback, done |

---

## Activity System Architecture

### Data Model

Every activity has:
```typescript
{
  id: string;           // UUID
  node_id: string;      // Parent node UUID
  type: ActivityType;   // Activity type enum
  sequence_number: number;
  instruction: {
    en: string;
    ar?: string;
    audio_url?: string;
  };
  config: ActivityConfig; // Type-specific config
  is_published: boolean;
  template_id?: string;
  created_at: string;
  updated_at: string;
}
```

### Form Selection Flow

```
ActivityTypeSelectorModal → user picks type
       ↓
ActivityFormModal → loads form via getActivityFormComponent(type)
       ↓
activityFormComponents map → returns specific form component
       ↓
Form Component → renders config UI, calls onChange
```

### LetterReference Usage

All letter fields should use `LetterReference`:
```typescript
// Old format (avoid)
{ targetLetter: 'ب' }

// New format (use this)
{ targetLetter: { letterId: 'ba', form: 'isolated' } }
{ targetLetter: { letterId: 'ba', form: 'initial', haraka: 'fatha' } }

// Multi-select
{ targetLetter: [
    { letterId: 'ba', form: 'isolated' },
    { letterId: 'ba', form: 'initial' }
  ]
}
```

---

## Activity Types by Category

### 40+ Activity Types

**Introduction (2)**:
- `show_letter_or_word` - Display letter/word/image
- `camel_narration` - Mascot narration

**Recognition (5)**:
- `tap_letter_in_word` - Find letter in word
- `audio_letter_match` - Match audio to letter
- `letter_discrimination` - Distinguish similar letters
- `i_spy` - Find letters on screen
- `grid_tap` - Tap correct cells

**Writing (3)**:
- `trace_letter` - Guided tracing
- `color_letter` - Color inside letter
- `drag_dots_to_letter` - Place dots on letter

**Drag & Drop (5)**:
- `drag_items_to_target` - Generic drag/drop
- `drag_hamza_to_letter` - Place hamza
- `drag_haraka_to_letter` - Place diacritics
- `build_word_from_letters` - Spell word
- `tap_dot_position` - Identify dot positions

**Games (18)** - Target + Distractors pattern:
- `pop_balloons_with_letter`
- `catch_fish_with_letter`
- `add_pizza_toppings_with_letter`
- `letter_rain`
- `pick_from_tree`
- `pick_flowers`
- `tap_crescent_moons`
- `drag_to_animal_mouth`
- `feed_rabbit`
- `feed_baby`
- `piggy_bank`
- `snowflakes`
- `bear_honey`
- `fly_on_flowers`
- `deliver_envelope`
- `plant_seeds`
- `balance_scale`
- `ice_cream_stacking`
- `slingshot`

**Assessment (2)**:
- `multiple_choice_question`
- `memory_card_match`

**Phonics (2)**:
- `sound_blend` - Blend sounds
- `speech_practice` - Pronunciation

**Interactive (2)**:
- `content_with_cards` - Content + selectable cards
- `match_pairs` - Draw lines to match

**Break (1)**:
- `break_time_minigame` - Mini-games

**Other (1)**:
- `activity_request` - Placeholder

---

## Shared Components

Located at `kalam-dashboard-v2/components/builder/forms/shared/`:

| Component | Purpose |
|-----------|---------|
| `FormField` | Label + hint wrapper |
| `TextInput` | Text input with RTL support |
| `TextArea` | Multi-line text |
| `NumberInput` | Number input |
| `Checkbox` | Checkbox with label |
| `Select` | Dropdown select |
| `LetterSelector` | Letter picker with modal (supports single/multi, form selection) |
| `WordLetterPicker` | Pick letter from a word |
| `ModeToggle` | Toggle between modes |
| `ContentDisplayPicker` | Choose letter/word/image |
| `OptionSelector` | Grid of option buttons |
| `OptionsGrid` | Grid for MCQ options |
| `ImageLibraryModal` | Image picker |
| `TargetLetterWithDistractorsForm` | Reusable for 18+ activities |

---

## Duplicate Patterns to Consolidate

### 1. Content Type Toggle
4 forms implement inline 3-button grids for letter/word/image selection.
→ Use `ContentDisplayPicker` shared component

### 2. Grid Button Selection
5+ forms implement grid selectors differently.
→ Enhance `OptionSelector` to handle all cases

### 3. Preview Box
7 forms have preview boxes with similar styling.
→ Create `PreviewBox` shared component

### 4. Warning/Info Boxes
6+ forms implement alert boxes inline.
→ Create `AlertBox` shared component

### 5. Checkbox Implementation
4 forms use inline checkbox instead of shared `Checkbox`.
→ Use shared component consistently

---

## Testing the Dashboard

1. Start dev server:
```bash
cd /Users/salehqadan/Projects/KalamKids/kalam-dashboard-v2
npm run dev
# Runs on http://localhost:3002 (if 3000/3001 are in use)
```

2. Navigate to curriculum builder:
   - Go to `/curricula`
   - Select a curriculum
   - Click "Builder" to open the activity editor

3. Test each activity type:
   - Create new activity
   - Fill form fields
   - Verify data saves correctly
   - Check letter selection works

---

## Key Files Reference

### V2 Dashboard
```
kalam-dashboard-v2/
├── packages/curriculum-schemas/src/
│   ├── base.ts              # Core types, LetterReference
│   ├── activities/          # Activity-specific schemas
│   ├── index.ts             # Exports
│   └── utils.ts             # Utility functions
├── components/builder/
│   ├── forms/
│   │   ├── shared/          # Shared form components
│   │   ├── types.ts         # Form type definitions
│   │   ├── index.tsx        # Form registry
│   │   └── *Form.tsx        # Individual form components
│   ├── activity-form.tsx    # Form modal wrapper
│   ├── activity-type-picker.tsx
│   ├── curriculum-tree.tsx
│   └── letter-selector-modal.tsx
├── app/(dashboard)/curricula/[id]/builder/
│   └── page.tsx             # Builder page
└── lib/
    ├── hooks/useLetters.ts  # Letters data hook
    └── schemas/curriculum.ts # Additional schemas
```

### Backend
```
kalam-readers-backend/supabase/functions/_shared/curriculum-schemas/
├── base.ts                  # Core types (synced with v2)
├── activities/              # Activity schemas (synced with v2)
├── index.ts                 # Exports
└── utils.ts                 # Utility functions
```

---

## Next Steps for Implementation

1. **Sync ActivityType** - Add missing types to v2 schema package
2. **Fix TS errors** - Run `npx tsc --noEmit` and fix all errors
3. **Test existing forms** - Verify each form renders and saves correctly
4. **Complete incomplete forms** - Compare with original dashboard
5. **Add missing shared components** - PreviewBox, AlertBox, etc.
6. **Integration test** - Full flow from creating activity to saving

---

## Commands

```bash
# Start v2 dashboard
cd /Users/salehqadan/Projects/KalamKids/kalam-dashboard-v2
npm run dev

# Type check
npx tsc --noEmit

# Check schema package
cd packages/curriculum-schemas && npx tsc --noEmit

# Start backend (if needed)
cd /Users/salehqadan/Projects/KalamKids/kalam-readers-backend
deno task dev
```
