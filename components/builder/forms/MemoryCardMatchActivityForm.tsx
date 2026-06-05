"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, LetterSelector, OptionSelector, Checkbox, AudioPickerField, PreviewBox } from "./shared";
import { useLetters, getLetterDisplayChar } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference, LetterForm } from "./types";

interface MemoryCardLetter {
  letterId: string;
  form: LetterForm;
  matchingForm?: LetterForm;
  audioId?: string;
  audioUrl?: string;
}

interface MemoryCardConfig {
  letters?: MemoryCardLetter[];
  matchType?: "letter_to_letter" | "letter_to_sound" | "form_to_form";
  showHints?: boolean;
}

const FORM_OPTIONS: { value: LetterForm; label: string }[] = [
  { value: "isolated", label: "Isolated" },
  { value: "initial", label: "Initial" },
  { value: "medial", label: "Medial" },
  { value: "final", label: "Final" },
];

const MATCH_TYPE_OPTIONS = [
  { value: "letter_to_letter", label: "Letter to Letter", icon: "🔤" },
  { value: "letter_to_sound", label: "Letter to Sound", icon: "🔊" },
  { value: "form_to_form", label: "Form to Form", icon: "✨" },
];

export function MemoryCardMatchActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<MemoryCardConfig>) {
  const { getLetter } = useLetters();

  const letters: MemoryCardLetter[] = config?.letters || [];
  const matchType = config?.matchType || "letter_to_letter";
  const showHints = config?.showHints === true;

  const [editingLetterId, setEditingLetterId] = React.useState<string | null>(
    null
  );

  const getLetterDisplay = (letterId: string, form: LetterForm): string => {
    return getLetterDisplayChar({ letterId, form }, getLetter);
  };

  const handleLettersChange = (value: LetterReference[] | LetterReference | null) => {
    const refs = Array.isArray(value) ? value : value ? [value] : [];
    const newLetters: MemoryCardLetter[] = refs.map((ref) => {
      const existing = letters.find((l) => l.letterId === ref.letterId);
      return {
        letterId: ref.letterId,
        form: ref.form,
        matchingForm: existing?.matchingForm,
        audioId: existing?.audioId,
      };
    });
    onChange({ ...config, letters: newLetters });
  };

  const handleMatchingFormChange = (
    letterId: string,
    matchingForm: LetterForm | undefined
  ) => {
    const newLetters = letters.map((l) =>
      l.letterId === letterId
        ? { ...l, matchingForm: matchingForm === l.form ? undefined : matchingForm }
        : l
    );
    onChange({ ...config, letters: newLetters });
  };

  const handleAudioChange = (
    letterId: string,
    audioUrl: string | undefined,
    audioId?: string
  ) => {
    const newLetters = letters.map((l) =>
      l.letterId === letterId ? { ...l, audioId, audioUrl } : l
    );
    onChange({ ...config, letters: newLetters });
  };

  const lettersAsRefs: LetterReference[] = letters.map((l) => ({
    letterId: l.letterId,
    form: l.form,
  }));

  const hasCrossFormMatching = letters.some(
    (l) => l.matchingForm && l.matchingForm !== l.form
  );

  return (
    <div className="space-y-6">
      <FormField
        label="Letters to Match"
        hint="Select the letters to include in the memory game"
        required
      >
        <LetterSelector
          value={lettersAsRefs}
          onChange={handleLettersChange}
          multiSelect
          multiFormSelect
          showFormSelector
        />
      </FormField>

      <FormField label="Match Type" hint="How cards should be matched">
        <OptionSelector
          options={MATCH_TYPE_OPTIONS}
          value={matchType}
          onChange={(value) =>
            onChange({
              ...config,
              matchType: value as MemoryCardConfig["matchType"],
            })
          }
          columns={3}
        />
      </FormField>

      {matchType === "letter_to_letter" && letters.length > 0 && (
        <FormField
          label="Cross-Form Matching"
          hint="Set a different form for the matching card (e.g., isolated ↔ initial)"
        >
          <div className="space-y-3">
            {letters.map((letter) => {
              const hasMatchingForm =
                letter.matchingForm && letter.matchingForm !== letter.form;
              return (
                <div
                  key={letter.letterId}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all",
                    hasMatchingForm
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-arabic">
                        {getLetterDisplay(letter.letterId, letter.form)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({letter.form})
                      </span>
                      {hasMatchingForm && (
                        <>
                          <span className="text-muted-foreground">↔</span>
                          <span className="text-2xl font-arabic text-primary">
                            {getLetterDisplay(
                              letter.letterId,
                              letter.matchingForm!
                            )}
                          </span>
                          <span className="text-sm text-primary">
                            ({letter.matchingForm})
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingLetterId(
                          editingLetterId === letter.letterId
                            ? null
                            : letter.letterId
                        )
                      }
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        editingLetterId === letter.letterId
                          ? "bg-muted"
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      {editingLetterId === letter.letterId ? "Close" : "Edit Match"}
                    </button>
                  </div>

                  {editingLetterId === letter.letterId && (
                    <div className="flex gap-2 mt-2 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() =>
                          handleMatchingFormChange(letter.letterId, undefined)
                        }
                        className={cn(
                          "px-3 py-1.5 text-sm rounded border transition-all",
                          !letter.matchingForm ||
                            letter.matchingForm === letter.form
                            ? "bg-green-100 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-400"
                            : "bg-background border-border hover:border-primary/50"
                        )}
                      >
                        Same Form
                      </button>
                      {FORM_OPTIONS.filter((f) => f.value !== letter.form).map(
                        (form) => (
                          <button
                            key={form.value}
                            type="button"
                            onClick={() =>
                              handleMatchingFormChange(
                                letter.letterId,
                                form.value
                              )
                            }
                            className={cn(
                              "px-3 py-1.5 text-sm rounded border transition-all flex items-center gap-2",
                              letter.matchingForm === form.value
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-background border-border hover:border-primary/50"
                            )}
                          >
                            <span className="font-arabic">
                              {getLetterDisplay(letter.letterId, form.value)}
                            </span>
                            <span>{form.label}</span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasCrossFormMatching && (
            <p className="mt-2 text-sm text-primary">
              Cross-form matching enabled. Cards will show different forms of
              the same letter.
            </p>
          )}
        </FormField>
      )}

      {/* Audio Assignment for letter_to_sound mode */}
      {matchType === "letter_to_sound" && letters.length > 0 && (
        <FormField
          label="Letter Sound Audio"
          hint="Assign audio for each letter's sound card"
          required
        >
          <div className="space-y-3">
            {letters.map((letter) => {
              const letterData = getLetter(letter.letterId);
              const hasAudio = !!letter.audioUrl;
              return (
                <div
                  key={letter.letterId}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all",
                    hasAudio
                      ? "border-primary/40 bg-primary/5"
                      : "border-amber-300 bg-amber-50"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-arabic">
                      {getLetterDisplay(letter.letterId, letter.form)}
                    </span>
                    <span className="text-sm font-medium">
                      {letterData?.name_english || letter.letterId}
                    </span>
                    {!hasAudio && (
                      <span className="text-xs text-amber-600 ml-auto">
                        Audio required
                      </span>
                    )}
                  </div>
                  <AudioPickerField
                    value={letter.audioUrl}
                    audioId={letter.audioId}
                    onChange={(url, id) =>
                      handleAudioChange(letter.letterId, url, id)
                    }
                  />
                </div>
              );
            })}
          </div>
          {letters.some((l) => !l.audioUrl) && (
            <PreviewBox variant="warning" className="mt-3">
              Some letters are missing audio. All letters need audio for
              letter-to-sound matching.
            </PreviewBox>
          )}
        </FormField>
      )}

      <FormField label="Show Hints">
        <Checkbox
          checked={showHints}
          onChange={(checked) => onChange({ ...config, showHints: checked })}
          label="Show hints after delay"
        />
      </FormField>
    </div>
  );
}
