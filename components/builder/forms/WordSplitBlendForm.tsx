"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, TextInput, WordSelector, AudioPickerField } from "./shared";
import { parseWordIntoSegments } from "@/lib/utils/soundBlend";
import type { BaseActivityFormProps } from "./types";

const MIN_CHUNKS = 2;
const MAX_CHUNKS = 6;

interface Chunk {
  text: string;
  audio_url?: string;
}

interface WordSplitBlendFormConfig {
  word?: string;
  wordId?: string;
  chunks?: Chunk[];
  wordAudioUrl?: string;
  transliteration?: string;
  meaning?: string;
}

/** Compare form: NFKC, strip harakat, tatweel, ZWJ/ZWNJ and whitespace. */
function normalizeForCompare(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[ً-ٰٟۖ-ۭ]/g, "")
    .replace(/[ـ‌‍\s]/g, "");
}

const EMPTY_CHUNKS: Chunk[] = [{ text: "" }, { text: "" }, { text: "" }];

export function WordSplitBlendForm({
  config,
  onChange,
}: BaseActivityFormProps<WordSplitBlendFormConfig>) {
  const word = config?.word || "";
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
