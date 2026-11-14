"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, TextInput, LetterSelector, Checkbox } from "./shared";
import { useLetters, resolveLetterReference } from "@/lib/hooks/useLetters";
import { useBlendWord } from "@/lib/hooks/useBlendWord";
import { applyHaraka } from "@/lib/utils/letterReference";
import { detectLetterDuration } from "@/lib/utils/soundBlend";
import {
  clearBlendFields,
  resolveStages,
  toggleStage,
  validateStages,
  type BlendContentType,
  type BlendSpeed,
  type SoundBlendConfig,
  type SoundDuration,
  type SoundSegment,
} from "@/lib/soundBlend/config";
import {
  changeSpeed,
  changeStages,
  previewV1Segments,
  soundBlendWordEditor,
} from "@/lib/soundBlend/editor";
import { BlendWordSection } from "./blendWord/BlendWordSection";
import { BlendSettingsFields } from "./soundBlend/BlendSettingsFields";
import type { BaseActivityFormProps, LetterReference } from "./types";

const DURATION_LABELS: Record<SoundDuration, { label: string; icon: string; color: string }> = {
  1: { label: "Stop", icon: "●", color: "text-red-600 dark:text-red-400" },
  2: { label: "Short", icon: "▬", color: "text-blue-600 dark:text-blue-400" },
  3: { label: "Long", icon: "▬▬", color: "text-amber-600 dark:text-amber-400" },
};

type ReadingMode = "segmented" | "blended" | "fluent";

const READING_MODES: { mode: ReadingMode; emoji: string; label: string; sub: string }[] = [
  { mode: "segmented", emoji: "🐢", label: "Segmented", sub: "Isolated letters" },
  { mode: "blended", emoji: "🐇", label: "Blended", sub: "Contextual letters" },
  { mode: "fluent", emoji: "📖", label: "Fluent", sub: "Connected word" },
];

/** Normalize legacy speed values to the segmented/blended/fluent vocabulary. */
function normalizeSpeed(speed: BlendSpeed): ReadingMode {
  if (speed === "slow" || speed === "none") return "segmented";
  if (speed === "fast") return "blended";
  return speed;
}

export function SoundBlendActivityForm({
  config,
  onChange,
  topic,
  saveError,
}: BaseActivityFormProps<SoundBlendConfig>) {
  const { letters } = useLetters();

  const cfg = React.useMemo<SoundBlendConfig>(() => config ?? {}, [config]);
  const contentType: BlendContentType = cfg.contentType || "word";
  const word = cfg.word || "";

  // In letter mode the picked letter is stored only as the `word` glyph (e.g.
  // "مَ"). Resolve it back to a LetterReference so the picker pre-selects when
  // editing. Strip diacritics first since the letters table keys on bare glyphs.
  const letterValue = React.useMemo<LetterReference | null>(() => {
    if (contentType !== "letter" || !word) return null;
    const bareGlyph = word.replace(/[ً-ْٰ]/g, "");
    return resolveLetterReference(bareGlyph, letters) as LetterReference | null;
  }, [contentType, word, letters]);
  const speed: BlendSpeed = cfg.speed || (contentType === "letter" ? "none" : "segmented");
  // Treat legacy values as their modern equivalents for the picker UI.
  const normalizedSpeed = normalizeSpeed(speed);
  const showBothSpeeds = cfg.showBothSpeeds || false;
  const transliteration = cfg.transliteration || "";
  const meaning = cfg.meaning || "";

  // The word editor reads everything from pure modules (lib/blendWord, lib/soundBlend).
  const blend = useBlendWord(cfg, { enabled: contentType === "word", topic, saveError });
  const { preview, ending, endingWarning } = blend;
  const stages = resolveStages(cfg);
  const stageProblems = cfg.stages ? validateStages(cfg.stages) : [];

  // v1 preview only: derived from the splitter for v2 rows, never saved.
  const segments: SoundSegment[] = React.useMemo(
    () => (contentType === "word" ? previewV1Segments(cfg, preview) : cfg.segments || []),
    [contentType, cfg, preview]
  );

  const updateConfig = React.useCallback(
    (updates: Partial<SoundBlendConfig>) => {
      onChange({ ...cfg, ...updates });
    },
    [cfg, onChange]
  );

  const handleContentTypeChange = (newContentType: BlendContentType) => {
    // Letter mode has no word model; word mode starts at the first blending stage.
    onChange({
      ...clearBlendFields(cfg),
      contentType: newContentType,
      word: "",
      segments: [],
      speed: newContentType === "letter" ? "none" : "segmented",
    });
  };

  const handleLetterSelect = (ref: LetterReference | LetterReference[] | null) => {
    if (!ref || Array.isArray(ref)) return;

    const letterData = letters.find((l) => l.id === ref.letterId);
    if (!letterData) return;

    // Get the letter form, then bake in the selected haraka. The sound_blend
    // schema stores the diacritic directly in the sound/word strings (e.g.
    // "عُ"), so the haraka from the picker MUST be applied here - otherwise the
    // letter renders bare in the app.
    const baseChar = letterData.forms?.[ref.form] || letterData.letter;
    const letterChar = applyHaraka(baseChar, ref.haraka);
    // A sukoon is a stop (1); the apps reject a sukoon with a longer duration.
    const segment: SoundSegment = { sound: letterChar, duration: detectLetterDuration(letterChar) };

    updateConfig({
      word: letterChar,
      segments: [segment],
    });
  };

  const getSpeedHint = () => {
    switch (normalizedSpeed) {
      case "segmented":
        return "Segmented: isolated letters, turtle slider (sound out each letter)";
      case "blended":
        return "Blended: contextual letter forms, rabbit slider";
      case "fluent":
        return "Fluent: connected whole word with a single filling bar";
      default:
        return "Select a reading mode";
    }
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Content Type"
        hint="Choose whether to blend a single letter or a full word"
        required
      >
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleContentTypeChange("letter")}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-3 rounded-lg border-2 transition-all min-w-[120px]",
              contentType === "letter"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-2xl font-arabic">ب</span>
            <span className="font-medium">Letter</span>
          </button>
          <button
            type="button"
            onClick={() => handleContentTypeChange("word")}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-3 rounded-lg border-2 transition-all min-w-[120px]",
              contentType === "word"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-2xl font-arabic">كلمة</span>
            <span className="font-medium">Word</span>
          </button>
        </div>
      </FormField>

      {contentType === "letter" && (
        <FormField label="Select Letter" hint="Choose the letter to blend" required>
          <LetterSelector
            topic={topic}
            showFormSelector
            value={letterValue}
            onChange={handleLetterSelect}
          />
        </FormField>
      )}

      {contentType === "word" && (
        <BlendWordSection
          config={cfg}
          editor={soundBlendWordEditor}
          state={blend}
          onChange={onChange}
          onWordChange={(value, wordData) =>
            onChange(
              soundBlendWordEditor.changeWord(
                cfg,
                value,
                wordData ? { id: wordData.id, is_pseudo: wordData.is_pseudo } : undefined
              )
            )
          }
          generalErrors={blend.saveErrors?.general ?? []}
        />
      )}

      {contentType === "word" && (
        <BlendSettingsFields
          ending={ending}
          stages={stages}
          endingWarning={endingWarning}
          stageProblems={stageProblems}
          onEndingChange={(value) => onChange(soundBlendWordEditor.changeEnding(cfg, value))}
          onStageToggle={(stage, on) => onChange(changeStages(cfg, toggleStage(stages, stage, on)))}
        />
      )}

      {segments.length > 0 && (
        <FormField
          label="v1 slider"
          hint="What the v1 app will show: stop (sukoon), short, long (madd). Preview only; for a word the server writes these on save."
        >
          <div className="flex flex-wrap justify-end gap-2" dir="rtl">
            {segments.map((segment, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-1 rounded-md border bg-muted px-2 py-1"
                title={DURATION_LABELS[segment.duration].label}
              >
                <span className="font-arabic text-xl">{segment.sound}</span>
                <span className={cn("text-xs", DURATION_LABELS[segment.duration].color)}>
                  {DURATION_LABELS[segment.duration].icon}
                </span>
              </div>
            ))}
          </div>
        </FormField>
      )}

      {/* Reading Mode — words only (letters always use the square slider). */}
      {contentType === "word" && (
        <FormField label="Reading Mode" hint={getSpeedHint()}>
          <div className="flex gap-3">
            {READING_MODES.map(({ mode, emoji, label, sub }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange(changeSpeed(cfg, mode))}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all min-w-[100px]",
                  normalizedSpeed === mode
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{emoji}</span>
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </button>
            ))}
          </div>
        </FormField>
      )}

      {/* Progression toggle — words only. */}
      {contentType === "word" && (
        <FormField
          label="Display Mode"
          hint="Show the full blending progression (segmented → blended → fluent) in sequence"
        >
          <Checkbox
            checked={showBothSpeeds}
            onChange={(checked) => updateConfig({ showBothSpeeds: checked })}
            label="Show the full progression (segmented → blended → fluent)"
          />
          {showBothSpeeds && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <strong>Preview:</strong> The child progresses through all three stages -
                on tablets they appear side by side, on phones they sequence as pages.
              </p>
              <div className="flex gap-4 mt-2 justify-center">
                {READING_MODES.map(({ mode, emoji, label }) => (
                  <div key={mode} className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FormField>
      )}

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium">Optional</h4>

        <FormField label="Transliteration" hint="e.g., 'jamal'">
          <TextInput
            value={transliteration}
            onChange={(value) => updateConfig({ transliteration: value })}
            placeholder="jamal"
          />
        </FormField>

        <FormField label="English Meaning" hint="e.g., 'camel'">
          <TextInput
            value={meaning}
            onChange={(value) => updateConfig({ meaning: value })}
            placeholder="camel"
          />
        </FormField>
      </div>
    </div>
  );
}
