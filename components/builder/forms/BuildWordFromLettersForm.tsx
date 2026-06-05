"use client";

/**
 * Build Word from Letters Activity Form
 *
 * Form for configuring the word building activity where students
 * drag scattered letters to build a target Arabic word.
 */

import * as React from "react";
import { FormField, Checkbox, WordSelector, TextInput } from "./shared";
import { cn } from "@/lib/utils";
import type { BaseActivityFormProps } from "./types";

type LetterDisplayMode = "contextual" | "isolated";

interface BuildWordConfig {
  useChildName?: boolean;
  targetWord?: string;
  letterDisplayMode?: LetterDisplayMode;
  wordMeaning?: { en?: string; ar?: string };
}

export function BuildWordFromLettersForm({
  config,
  onChange,
}: BaseActivityFormProps<BuildWordConfig>) {
  const useChildName = config?.useChildName || false;
  const targetWord = config?.targetWord || "";
  const letterDisplayMode = config?.letterDisplayMode || "contextual";
  const wordMeaningEn = config?.wordMeaning?.en || "";
  const wordMeaningAr = config?.wordMeaning?.ar || "";

  const updateConfig = (updates: Partial<BuildWordConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateWordMeaning = (lang: "en" | "ar", value: string) => {
    updateConfig({
      wordMeaning: {
        en: lang === "en" ? value : wordMeaningEn,
        ar: lang === "ar" ? value : wordMeaningAr,
      },
    });
  };

  const handleUseChildNameChange = (checked: boolean) => {
    if (checked) {
      updateConfig({ useChildName: true, targetWord: undefined });
    } else {
      updateConfig({ useChildName: false });
    }
  };

  return (
    <div className="space-y-4">
      {/* Use Child's Name Checkbox */}
      <FormField
        label="Word Source"
        hint="Choose whether to use the child's name or a custom word"
      >
        <Checkbox
          checked={useChildName}
          onChange={handleUseChildNameChange}
          label="Use child's name"
        />
      </FormField>

      {/* Letter Display Mode */}
      <FormField
        label="Letter Display Mode"
        hint="How the scattered letters appear for the child to drag"
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateConfig({ letterDisplayMode: "contextual" })}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              letterDisplayMode === "contextual"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <div className="text-2xl font-arabic flex gap-1">
              <span>بـ</span>
              <span>ـا</span>
              <span>ـب</span>
            </div>
            <div className="text-xs font-medium">Contextual</div>
            <div className="text-xs text-muted-foreground text-center">
              Letters in word form
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateConfig({ letterDisplayMode: "isolated" })}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              letterDisplayMode === "isolated"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <div className="text-2xl font-arabic flex gap-1">
              <span>ب</span>
              <span>ا</span>
              <span>ب</span>
            </div>
            <div className="text-xs font-medium">Isolated</div>
            <div className="text-xs text-muted-foreground text-center">
              Letters in base form
            </div>
          </button>
        </div>
      </FormField>

      {/* Target Word - only show if not using child's name */}
      {!useChildName && (
        <>
          <WordSelector
            value={targetWord}
            onChange={(word, wordData) => {
              updateConfig({
                targetWord: word,
                wordMeaning: {
                  en: wordData?.english || wordMeaningEn,
                  ar: wordMeaningAr,
                },
              });
            }}
            label="Target Word"
            required
            showTranslation
            translationValue={wordMeaningEn}
            onTranslationChange={(value) => updateWordMeaning("en", value)}
            placeholder="Type to search word library..."
          />

          {/* Word Meaning (Arabic) */}
          <FormField
            label="Word Meaning (Arabic)"
            hint="Arabic translation or meaning (optional)"
          >
            <TextInput
              value={wordMeaningAr}
              onChange={(value) => updateWordMeaning("ar", value)}
              placeholder="باب"
              dir="rtl"
            />
          </FormField>
        </>
      )}

      {useChildName && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            The activity will use the child&apos;s registered name. The letters
            will be scrambled for them to arrange.
          </p>
        </div>
      )}
    </div>
  );
}
