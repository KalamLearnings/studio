"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, TextInput, WordSelector, AudioPickerField } from "./shared";
import { parseWordIntoSegments } from "@/lib/utils/soundBlend";
import { isBlendV2 } from "@/lib/blendWord/config";
import {
  convertToWordModel,
  hasHandMadeChunks,
  type WordSplitBlendFormConfig,
  type WordSplitChunk as Chunk,
} from "@/lib/wordSplitBlend/config";
import { WordSplitBlendV2Form } from "./wordSplitBlend/WordSplitBlendV2Form";
import { UseWordModelAction } from "./wordSplitBlend/UseWordModelAction";
import type { BaseActivityFormProps } from "./types";
import { useBackendCapabilities } from "@/lib/backend/useBackendCapabilities";

const MIN_CHUNKS = 2;
const MAX_CHUNKS = 6;

/** Compare form: NFKC, strip harakat, tatweel, ZWJ/ZWNJ and whitespace. */
function normalizeForCompare(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[ً-ٰٟۖ-ۭ]/g, "")
    .replace(/[ـ‌‍\s]/g, "");
}

const EMPTY_CHUNKS: Chunk[] = [{ text: "" }, { text: "" }, { text: "" }];

/**
 * word_split_blend. A v2 row (`blendVersion: 2`) always opens the word-model
 * form, whose chunks are the server's and read-only; it never opens in the
 * hand-made chunk editor. A legacy row keeps that editor and saves as before,
 * unless the author converts it with "Use the word model".
 *
 * A backend without the blend word model (PROD, `lib/backend/capabilities.ts`)
 * always gets the hand-made chunk editor, with no "Use the word model"; a v2
 * row opens there with its reference's text, and saves in v1's shape.
 */
export function WordSplitBlendForm(props: BaseActivityFormProps<WordSplitBlendFormConfig>) {
  const { blendWordModel } = useBackendCapabilities();
  if (blendWordModel && isBlendV2(props.config)) return <WordSplitBlendV2Form {...props} />;
  return <LegacyWordSplitBlendForm {...props} wordModel={blendWordModel} />;
}

function LegacyWordSplitBlendForm({
  config,
  onChange,
  wordModel,
}: BaseActivityFormProps<WordSplitBlendFormConfig> & { wordModel: boolean }) {
  // A v2 row opened without the word model (PROD) shows its reference's text.
  const word = config?.word || config?.wordRef?.text || "";
  const chunks = config?.chunks?.length ? config.chunks : EMPTY_CHUNKS;

  const updateConfig = (updates: Partial<WordSplitBlendFormConfig>) => {
    onChange({ ...config, chunks, ...updates });
  };

  const updateChunk = (index: number, updates: Partial<Chunk>) => {
    updateConfig({ chunks: chunks.map((c, i) => (i === index ? { ...c, ...updates } : c)) });
  };

  const moveChunk = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= chunks.length) return;
    const next = [...chunks];
    [next[index], next[target]] = [next[target], next[index]];
    updateConfig({ chunks: next });
  };

  const removeChunk = (index: number) => {
    if (chunks.length <= MIN_CHUNKS) return;
    updateConfig({ chunks: chunks.filter((_, i) => i !== index) });
  };

  const addChunk = () => {
    if (chunks.length >= MAX_CHUNKS) return;
    updateConfig({ chunks: [...chunks, { text: "" }] });
  };

  const autoSplit = () => {
    const clusters = parseWordIntoSegments(word).map((s) => s.baseLetter + s.harakat);
    if (clusters.length < MIN_CHUNKS) return;
    // More clusters than the cap: merge the overflow into the last chunk.
    const head = clusters.slice(0, MAX_CHUNKS - 1);
    const tail = clusters.slice(MAX_CHUNKS - 1);
    const texts = clusters.length > MAX_CHUNKS ? [...head, tail.join("")] : clusters;
    // Keep any existing chunk audio at the same position.
    updateConfig({ chunks: texts.map((text, i) => ({ text, audio_url: chunks[i]?.audio_url })) });
  };

  const joined = chunks.map((c) => c.text).join("");
  const complete = word.trim() !== "" && chunks.every((c) => c.text.trim() !== "");
  const mismatch = complete && normalizeForCompare(joined) !== normalizeForCompare(word);

  return (
    <div className="space-y-6">
      {wordModel && (
        <UseWordModelAction
          hasHandMadeChunks={hasHandMadeChunks(config ?? {})}
          onConvert={() => onChange(convertToWordModel(config ?? {}))}
        />
      )}

      <WordSelector
        value={word}
        onChange={(value, wordData) =>
          updateConfig({
            word: value,
            wordId: wordData?.id,
            ...(wordData?.transliteration ? { transliteration: wordData.transliteration } : {}),
            ...(wordData?.english ? { meaning: wordData.english } : {}),
          })
        }
        label="Arabic Word"
        required
        placeholder="Type to search word library..."
      />

      <FormField
        label={`Chunks (${chunks.length}/${MAX_CHUNKS})`}
        hint="In reading order. Joined together they must rebuild the word (diacritics ignored)."
        required
      >
        <div className="space-y-2">
          {chunks.map((chunk, index) => (
            <div key={index} className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                <Input
                  dir="rtl"
                  value={chunk.text}
                  onChange={(e) => updateChunk(index, { text: e.target.value })}
                  placeholder="مَدْ"
                  className="font-arabic text-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveChunk(index, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={index === chunks.length - 1}
                  onClick={() => moveChunk(index, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={chunks.length <= MIN_CHUNKS}
                  onClick={() => removeChunk(index)}
                  aria-label="Remove chunk"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <AudioPickerField
                label="Chunk audio (optional)"
                value={chunk.audio_url}
                onChange={(audioUrl) => updateChunk(index, { audio_url: audioUrl })}
              />
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={chunks.length >= MAX_CHUNKS}
              onClick={addChunk}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add chunk
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!word.trim()}
              onClick={autoSplit}
            >
              <Scissors className="mr-1 h-4 w-4" />
              Auto-split into letters
            </Button>
          </div>
        </div>
      </FormField>

      <FormField label="Preview" hint="Chunks joined together">
        <div
          dir="rtl"
          className="rounded-lg border bg-muted p-3 text-center font-arabic text-3xl min-h-[3.5rem]"
        >
          {joined || <span className="text-sm text-muted-foreground">-</span>}
        </div>
        {mismatch && (
          <p className="text-sm text-destructive">
            Chunks do not rebuild the word. Check the spelling of each chunk.
          </p>
        )}
      </FormField>

      <AudioPickerField
        label="Full-word audio (optional)"
        value={config?.wordAudioUrl}
        onChange={(audioUrl) => updateConfig({ wordAudioUrl: audioUrl })}
      />

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium">Optional</h4>
        <FormField label="Transliteration" hint="e.g., 'madrasa'">
          <TextInput
            value={config?.transliteration || ""}
            onChange={(value) => updateConfig({ transliteration: value || undefined })}
            placeholder="madrasa"
          />
        </FormField>
        <FormField label="English Meaning" hint="e.g., 'school'">
          <TextInput
            value={config?.meaning || ""}
            onChange={(value) => updateConfig({ meaning: value || undefined })}
            placeholder="school"
          />
        </FormField>
      </div>
    </div>
  );
}
