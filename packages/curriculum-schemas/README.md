# @kalam/curriculum-schemas

**Unified Zod schemas for Kalam Kids curriculum activities**

This package is the **single source of truth** for activity type definitions, validation, and types across the entire Kalam Kids platform.

## 📦 What's Inside

- **10 Activity Type Schemas** - Complete validation for all curriculum activities
- **TypeScript Types** - Auto-generated from Zod schemas
- **Runtime Validation** - Validate data at runtime with Zod
- **Compile-time Safety** - Full TypeScript support

## 🎯 Usage

### Install

```bash
npm install @kalam/curriculum-schemas
```

### Import Types

```typescript
import type {
  Activity,
  ActivityType,
  TapLetterInWordActivity,
  ShowLetterOrWordActivity
} from '@kalam/curriculum-schemas';
```

### Validate at Runtime

```typescript
import { ActivitySchema } from '@kalam/curriculum-schemas';

const result = ActivitySchema.safeParse(activityData);
if (result.success) {
  // data is valid and fully typed
  const activity = result.data;
} else {
  // validation errors
  console.error(result.error);
}
```

### Get Schema for Specific Activity Type

```typescript
import { getActivityConfigSchema } from '@kalam/curriculum-schemas';

const tapSchema = getActivityConfigSchema('tap_letter_in_word');
const result = tapSchema.safeParse(config);
```

## 🏗️ Architecture

This package is used by:
- **Dashboard** (Next.js) - Form validation
- **Backend** (Supabase Edge Functions) - API validation
- **Mobile App** (React Native) - Runtime validation & types

## 📚 Activity Types

1. `show_letter_or_word` - Display single letter or word
2. `tap_letter_in_word` - Tap target letters in word
3. `trace_letter` - Guided letter tracing
4. `pop_balloons_with_letter` - Pop balloons with target letter
5. `break_time_minigame` - Mental break mini-games
6. `multiple_choice_question` - Multiple choice questions
7. `drag_items_to_target` - Drag items to targets
8. `catch_fish_with_letter` - Catch fish with letter
9. `add_pizza_toppings_with_letter` - Add pizza toppings
10. `build_word_from_letters` - Build words from letters

## 🔧 Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Type check
npm run typecheck
```

## 📄 License

MIT
