# Usage Examples

## Installation

```bash
npm install @kalam/curriculum-schemas
```

## Basic Usage

### 1. Import Types

```typescript
import type {
  Activity,
  ActivityType,
  TapLetterInWordActivity,
  ShowLetterOrWordActivity,
} from '@kalam/curriculum-schemas';
```

### 2. Validate Activity Data

```typescript
import { ActivitySchema, safeValidate } from '@kalam/curriculum-schemas';

const activityData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: 'tap_letter_in_word',
  node_id: '123e4567-e89b-12d3-a456-426614174001',
  sequence_number: 1,
  instruction: {
    en: 'Tap all the Baa letters',
    ar: 'انقر على جميع حروف الباء',
  },
  config: {
    targetWord: 'باب',
    targetLetter: 'ب',
    targetCount: 2,
    showHighlight: true,
    highlightColor: '#4CAF50',
    provideFeedback: true,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Validate with safeParse
const result = ActivitySchema.safeParse(activityData);

if (result.success) {
  console.log('✅ Valid activity:', result.data);
  // TypeScript knows the exact type based on discriminated union
} else {
  console.error('❌ Validation errors:', result.error);
}
```

### 3. Type-Safe Activity Handling

```typescript
import type { Activity } from '@kalam/curriculum-schemas';

function handleActivity(activity: Activity) {
  // TypeScript narrows the type based on the 'type' field
  switch (activity.type) {
    case 'tap_letter_in_word':
      // TypeScript knows activity is TapLetterInWordActivity
      console.log('Target word:', activity.config.targetWord);
      console.log('Target letter:', activity.config.targetLetter);
      break;

    case 'show_letter_or_word':
      // TypeScript knows activity is ShowLetterOrWordActivity
      if (activity.config.contentType === 'letter') {
        console.log('Letter:', activity.config.letter);
      } else {
        console.log('Word:', activity.config.word);
      }
      break;

    case 'trace_letter':
      console.log('Letter to trace:', activity.config.letterForm);
      console.log('Position:', activity.config.position);
      break;

    // ... handle other types
  }
}
```

### 4. Validate Only Config

```typescript
import { getActivityConfigSchema } from '@kalam/curriculum-schemas';

const tapConfigSchema = getActivityConfigSchema('tap_letter_in_word');

const configData = {
  targetWord: 'باب',
  targetLetter: 'ب',
  targetCount: 2,
};

const result = tapConfigSchema.safeParse(configData);
```

### 5. Get Default Config

```typescript
import { createDefaultConfig } from '@kalam/curriculum-schemas';

const defaultTapConfig = createDefaultConfig('tap_letter_in_word');
console.log(defaultTapConfig);
// {
//   targetWord: 'باب',
//   targetLetter: 'ب',
//   targetCount: 2,
//   showHighlight: true,
//   highlightColor: '#4CAF50',
//   provideFeedback: true
// }
```

### 6. Helper Functions

```typescript
import {
  isValidActivityType,
  getActivityCategory,
  getEstimatedDuration,
  ACTIVITY_TYPE_LABELS,
} from '@kalam/curriculum-schemas';

// Check if type is valid
isValidActivityType('tap_letter_in_word'); // true
isValidActivityType('invalid_type'); // false

// Get category
getActivityCategory('tap_letter_in_word'); // 'Recognition'
getActivityCategory('break_time_minigame'); // 'Break'

// Get estimated duration
getEstimatedDuration('tap_letter_in_word'); // 30 (seconds)

// Get human-readable label
ACTIVITY_TYPE_LABELS['tap_letter_in_word']; // 'Tap Target Letters in Word'
```

## Activity Examples

### Show Letter or Word

```typescript
const showLetterActivity = {
  type: 'show_letter_or_word',
  config: {
    contentType: 'letter',
    letter: 'ب',
    autoAdvance: false,
    displayDuration: 3000,
  },
};

const showWordActivity = {
  type: 'show_letter_or_word',
  config: {
    contentType: 'word',
    word: 'باب',
    autoAdvance: true,
    displayDuration: 5000,
  },
};
```

### Tap Letter in Word

```typescript
const tapActivity = {
  type: 'tap_letter_in_word',
  config: {
    targetWord: 'باب',
    targetLetter: 'ب',
    targetCount: 2,
    showHighlight: true,
    highlightColor: '#4CAF50',
    provideFeedback: true,
    wordMeaning: 'Door',
  },
};
```

### Trace Letter

```typescript
const traceActivity = {
  type: 'trace_letter',
  config: {
    letterForm: 'ب',
    position: 'isolated',
    traceCount: 3,
    maxAttempts: 5,
    recognitionTolerance: 0.7,
  },
};
```

### Pop Balloons with Letter

```typescript
const balloonActivity = {
  type: 'pop_balloons_with_letter',
  config: {
    correctLetter: 'ب',
    correctLetterForms: ['ب', 'بـ', 'ـبـ', 'ـب'],
    distractorLetters: ['ت', 'ث', 'ن', 'ي'],
    duration: 60,
    targetCount: 10,
    balloonSpeed: 1.0,
    spawnRate: 1.5,
    correctRatio: 0.4,
  },
};
```

### Build Word from Letters

```typescript
const buildWordActivity = {
  type: 'build_word_from_letters',
  config: {
    targetWord: 'باب',
    showConnectedForm: true,
    highlightCorrectPositions: true,
    scrambleLetters: true,
    showWordMeaning: true,
    wordMeaning: {
      en: 'Door',
      ar: 'باب',
    },
  },
};
```

### Multiple Choice Question

```typescript
const mcqActivity = {
  type: 'multiple_choice_question',
  config: {
    question: {
      en: 'Which letter is Baa?',
      ar: 'أي حرف هو الباء؟',
    },
    options: [
      {
        id: 'opt1',
        text: { en: 'Baa', ar: 'باء' },
        isCorrect: true,
      },
      {
        id: 'opt2',
        text: { en: 'Taa', ar: 'تاء' },
        isCorrect: false,
      },
      {
        id: 'opt3',
        text: { en: 'Thaa', ar: 'ثاء' },
        isCorrect: false,
      },
    ],
    layout: 'vertical',
    randomizeOptions: true,
  },
};
```

## Error Handling

```typescript
import { safeValidate, type ValidationError } from '@kalam/curriculum-schemas';

function displayErrors(errors: ValidationError[]) {
  errors.forEach((error) => {
    console.error(`Field: ${error.field}`);
    console.error(`Message: ${error.message}`);
    console.error(`Code: ${error.code}`);
  });
}

const result = safeValidate(ActivitySchema, invalidData);
if (!result.success) {
  displayErrors(result.errors!);
}
```

## Backend Usage (Supabase Edge Functions)

```typescript
import { ActivitySchema, validateOrThrow } from '@kalam/curriculum-schemas';

export async function createActivity(req: Request) {
  const body = await req.json();

  try {
    // Validate and throw on error
    const validActivity = validateOrThrow(
      ActivitySchema,
      body,
      'Invalid activity data'
    );

    // Insert to database
    await supabase.from('curriculum_activities').insert(validActivity);

    return new Response(JSON.stringify(validActivity), { status: 201 });
  } catch (error) {
    return new Response(error.message, { status: 400 });
  }
}
```

## React Form Validation (Dashboard)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TapLetterInWordConfigSchema } from '@kalam/curriculum-schemas';

function TapActivityForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(TapLetterInWordConfigSchema),
  });

  const onSubmit = (data) => {
    console.log('Valid config:', data);
    // Submit to API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('targetWord')} />
      {errors.targetWord && <span>{errors.targetWord.message}</span>}

      <input {...register('targetLetter')} maxLength={1} />
      {errors.targetLetter && <span>{errors.targetLetter.message}</span>}

      <button type="submit">Create Activity</button>
    </form>
  );
}
```
