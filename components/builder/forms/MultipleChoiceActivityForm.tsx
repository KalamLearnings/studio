"use client";

import * as React from "react";
import {
  ModeToggle,
  ContentDisplayPicker,
  ContentItemGrid,
  PromptKindPicker,
  WordSelector,
  FieldErrors,
} from "./shared";
import type { BaseActivityFormProps, LetterReference } from "./types";
import {
  emptied,
  gridKindOf,
  isFilled,
  kindOfMcqMode,
  MCQ_MODE_OF_KIND,
  mcqOptionFromItem,
  mcqOptionItem,
  promptKind,
  withPromptKind,
  type EditorItem,
  type EditorKind,
} from "@/lib/activityConfig/contentItems";

/**
 * Multiple choice (content model CM-S6). The options are content items in the
 * shared grid (letter, library word, library image, numeral). What the form
 * stores per option is v1's shape with the reference beside it
 * (`mcqOptionFromItem`). A question with a prompt kind whose options and
 * stimulus are all letters, library words or numerals is saved canonically,
 * and the server writes v1's option text, mode and question from the
 * references (lib/activityConfig/canonical.ts, R2). A library word picked as
 * the stimulus is kept as `prompt.target`.
 */

interface MultipleChoiceOption {
  id: string;
  text?: { en?: string; ar?: string };
  image?: string;
  letter?: LetterReference;
  isCorrect: boolean;
}

interface MultipleChoiceConfig {
  question?: { en?: string; ar?: string };
  questionImage?: string;
  targetLetter?: LetterReference;
  mode?: "letter" | "word" | "image" | "text";
  options?: MultipleChoiceOption[];
  prompt?: { kind?: string; target?: unknown };
}

const CONTENT_TYPE_OPTIONS = [
  { value: "text" as const, label: "Letter/Word", icon: "📝" },
  { value: "image" as const, label: "Image", icon: "🖼️" },
];

const ANSWER_KINDS: EditorKind[] = ["letter", "word", "image", "numeral"];

const generateOptionId = (index: number) => `option_${index}_${Date.now()}`;

/** The prompt with its stimulus target set or cleared; the kind stays. */
function withStimulus(prompt: MultipleChoiceConfig["prompt"], target: unknown): MultipleChoiceConfig["prompt"] {
  const next = { ...(prompt ?? {}) };
  if (target) next.target = target;
  else delete next.target;
  return Object.keys(next).length ? next : undefined;
}

export function MultipleChoiceActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<MultipleChoiceConfig>) {
  const questionAr = config?.question?.ar || "";
  const questionImage = config?.questionImage || "";

  const [contentType, setContentType] = React.useState<"text" | "image">(
    questionImage ? "image" : "text"
  );

  // Options are derived from config (single source of truth) so editing an
  // existing activity pre-populates and stays in sync — no duplicate local
  // state to drift out of date.
  const options: MultipleChoiceOption[] =
    config?.options && config.options.length > 0
      ? config.options
      : [
          { id: generateOptionId(0), text: { en: "", ar: "" }, isCorrect: false },
          { id: generateOptionId(1), text: { en: "", ar: "" }, isCorrect: false },
          { id: generateOptionId(2), text: { en: "", ar: "" }, isCorrect: false },
          { id: generateOptionId(3), text: { en: "", ar: "" }, isCorrect: false },
        ];
  const items: EditorItem[] = options.map((o) => mcqOptionItem(o, config?.mode));

  const [answerKind, setAnswerKind] = React.useState<EditorKind>(() =>
    gridKindOf(items, kindOfMcqMode(config?.mode))
  );

  const updateConfig = (updates: Partial<MultipleChoiceConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleContentTypeChange = (type: "text" | "image") => {
    setContentType(type);
    if (type === "image") {
      updateConfig({ question: { en: "", ar: "" }, targetLetter: undefined, prompt: withStimulus(config?.prompt, undefined) });
    } else {
      updateConfig({ questionImage: "" });
    }
  };

  const handleChangeItem = (index: number, item: EditorItem) => {
    const next = [...options];
    next[index] = mcqOptionFromItem(item, options[index]) as unknown as MultipleChoiceOption;
    updateConfig({ options: next });
  };

  // v1 shows one kind per question (`mode`): switching it empties the options of another kind.
  const handleKindChange = (kind: EditorKind) => {
    setAnswerKind(kind);
    updateConfig({
      mode: MCQ_MODE_OF_KIND[kind],
      options: options.map((o, i) =>
        isFilled(items[i]) && items[i].kind !== kind
          ? (mcqOptionFromItem(emptied({ ...items[i], kind }), o) as unknown as MultipleChoiceOption)
          : o
      ),
    });
  };

  return (
    <div className="space-y-6">
      <ModeToggle
        label="Display Above Options"
        value={contentType}
        options={CONTENT_TYPE_OPTIONS}
        onChange={handleContentTypeChange}
        borderBottom
      />

      <div className="space-y-4">
        {contentType === "text" ? (
          <WordSelector
            value={questionAr}
            onChange={(value, word) =>
              updateConfig({
                question: { en: "", ar: value },
                // a library word is the stimulus by reference; typed text is read on save
                prompt: withStimulus(config?.prompt, word ? { kind: "word", word: { wordId: word.id, text: value } } : undefined),
              })
            }
            label="Letter or Word"
            placeholder="Type to search word library..."
          />
        ) : (
          <ContentDisplayPicker
            contentType="image"
            image={questionImage}
            onImageChange={(url) => updateConfig({ questionImage: url })}
            label="Question Image"
          />
        )}
      </div>

      <PromptKindPicker
        value={promptKind(config)}
        onChange={(kind) => onChange(withPromptKind({ ...config }, kind))}
      />

      <ContentItemGrid
        items={items}
        onChangeItem={handleChangeItem}
        kind={answerKind}
        onKindChange={handleKindChange}
        allowedKinds={ANSWER_KINDS}
        kindLabel="Answer Type"
        title="Answer Options"
        showCorrectCheckbox
        columns={4}
        topic={topic}
      />
      <FieldErrors path="options" />
    </div>
  );
}
