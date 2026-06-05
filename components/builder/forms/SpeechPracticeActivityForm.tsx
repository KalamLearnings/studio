"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FormField,
  NumberInput,
  LetterSelector,
  WordLetterPicker,
  extractLettersFromWord,
  WordSelector,
} from "./shared";
import type { BaseActivityFormProps, LetterReference } from "./types";

interface SpeechPracticeConfig {
  contentType?: "letter" | "word" | "letter_in_word";
  targetLetter?: LetterReference | null;
  word?: string;
  letter?: string;
  passingScore?: number;
}

export function SpeechPracticeActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<SpeechPracticeConfig>) {
  const rawContentType = config?.contentType || "letter";
  const contentType: "letter" | "word" =
    rawContentType === "letter" ? "letter" : "word";

  const targetLetter = config?.targetLetter || null;
  const word = config?.word || "";
  const focusLetter = config?.letter || "";
  const passingScore = config?.passingScore || 60;

  const updateConfig = (updates: Partial<SpeechPracticeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleContentTypeChange = (next: "letter" | "word") => {
    if (next === "letter") {
      updateConfig({
        contentType: "letter",
        word: undefined,
        letter: undefined,
      });
    } else {
      updateConfig({
        contentType: "word",
        targetLetter: undefined,
      });
    }
  };

  const handleFocusLetterChange = (letter: string) => {
    updateConfig({
      contentType: "letter_in_word",
      letter,
    });
  };

  const handleClearFocusLetter = () => {
    updateConfig({
      contentType: "word",
      letter: undefined,
    });
  };

  React.useEffect(() => {
    if (!focusLetter) return;
    const lettersInWord = extractLettersFromWord(word);
    if (!lettersInWord.includes(focusLetter)) {
      updateConfig({
        contentType: "word",
        letter: undefined,
      });
    }
  }, [word]);

  return (
    <div className="space-y-4">
      <FormField
        label="Content Type"
        hint="What should the child pronounce?"
        required
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleContentTypeChange("letter")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              contentType === "letter"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <div className="text-3xl font-arabic">أ</div>
            <div className="text-xs font-medium">Letter</div>
          </button>

          <button
            type="button"
            onClick={() => handleContentTypeChange("word")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              contentType === "word"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <div className="text-3xl font-arabic">كلمة</div>
            <div className="text-xs font-medium">Word</div>
          </button>
        </div>
      </FormField>

      {contentType === "letter" && (
        <FormField
          label="Letter"
          hint="Select letter and form to pronounce"
          required
        >
          <LetterSelector
            value={targetLetter}
            onChange={(value) =>
              updateConfig({
                targetLetter: Array.isArray(value) ? value[0] : value,
              })
            }
            topic={topic}
            showFormSelector
          />
        </FormField>
      )}

      {contentType === "word" && (
        <>
          <WordSelector
            value={word}
            onChange={(value) => updateConfig({ word: value })}
            label="Word"
            required
            placeholder="Type to search word library..."
          />

          <FormField
            label="Focus Letter (Optional)"
            hint="If set, the child should focus on pronouncing this specific letter within the word"
          >
            <WordLetterPicker
              word={word}
              value={focusLetter}
              onChange={handleFocusLetterChange}
              onClear={handleClearFocusLetter}
              emptyMessage="Enter a word first to see available letters"
            />
          </FormField>
        </>
      )}

      <FormField label="Passing Score" hint="Minimum score to pass (0-100)">
        <NumberInput
          value={passingScore}
          onChange={(value) => updateConfig({ passingScore: value })}
          min={0}
          max={100}
          placeholder="60"
        />
      </FormField>
    </div>
  );
}
