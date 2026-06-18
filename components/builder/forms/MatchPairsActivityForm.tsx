"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  TextInput,
  LetterSelector,
  Checkbox,
  ImageLibraryModal,
  AudioPickerField,
} from "./shared";
import { useLetters } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference, LetterForm } from "./types";

type MatchItemType = "letter" | "word" | "image" | "audio";

interface MatchItem {
  type: MatchItemType;
  value: string;
  letterId?: string;
  form?: LetterForm;
  label?: string;
  audioId?: string;
  audioUrl?: string;
}

interface MatchPair {
  left: MatchItem;
  right: MatchItem;
}

interface MatchPairsConfig {
  pairs?: MatchPair[];
  shuffleItems?: boolean;
}

const ITEM_TYPE_OPTIONS: { value: MatchItemType; label: string; icon: string }[] = [
  { value: "letter", label: "Letter", icon: "ا" },
  { value: "word", label: "Word", icon: "📖" },
  { value: "image", label: "Image", icon: "🖼️" },
  { value: "audio", label: "Audio", icon: "🔊" },
];

const createEmptyPair = (): MatchPair => ({
  left: { type: "letter", value: "" },
  right: { type: "letter", value: "" },
});

interface MatchItemEditorProps {
  item: MatchItem;
  onChange: (item: MatchItem) => void;
}

function MatchItemEditor({ item, onChange }: MatchItemEditorProps) {
  const { letters } = useLetters();
  const [showImageLibrary, setShowImageLibrary] = React.useState(false);

  const handleTypeChange = (type: MatchItemType) => {
    onChange({
      type,
      value: "",
      letterId: undefined,
      form: undefined,
      label: undefined,
      audioId: undefined,
      audioUrl: undefined,
    });
  };

  const handleLetterChange = (ref: LetterReference | LetterReference[] | null) => {
    if (!ref) {
      onChange({ ...item, value: "", letterId: undefined, form: undefined });
      return;
    }

    const letterRef = Array.isArray(ref) ? ref[0] : ref;
    const letterData = letters.find((l) => l.id === letterRef.letterId);
    const displayChar =
      letterData?.forms?.[letterRef.form] || letterData?.letter || "";

    onChange({
      ...item,
      value: displayChar,
      letterId: letterRef.letterId,
      form: letterRef.form,
    });
  };

  const getLetterRef = (): LetterReference | null => {
    if (item.type === "letter" && item.letterId && item.form) {
      return { letterId: item.letterId, form: item.form };
    }
    return null;
  };

  return (
    <div className="p-3 bg-muted/50 rounded-lg border">
      <div className="flex gap-1 mb-3">
        {ITEM_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleTypeChange(opt.value)}
            className={cn(
              "flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors",
              item.type === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-background border hover:bg-muted"
            )}
          >
            <span className="mr-1">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {item.type === "letter" && (
        <LetterSelector
          value={getLetterRef()}
          onChange={handleLetterChange}
          showFormSelector
        />
      )}

      {item.type === "word" && (
        <TextInput
          value={item.value}
          onChange={(value) => onChange({ ...item, value })}
          placeholder="كلمة"
          dir="rtl"
        />
      )}

      {item.type === "image" && (
        <>
          {item.value ? (
            <div className="relative inline-block">
              <img
                src={item.value}
                alt="Selected"
                className="max-w-full max-h-24 rounded-lg border"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowImageLibrary(true)}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...item, value: "" })}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowImageLibrary(true)}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-muted-foreground transition-colors"
            >
              <div className="text-2xl mb-1">🖼️</div>
              <p className="text-xs text-muted-foreground">Select image</p>
            </button>
          )}

          <ImageLibraryModal
            isOpen={showImageLibrary}
            onClose={() => setShowImageLibrary(false)}
            onSelectImage={(url) => {
              onChange({ ...item, value: url });
              setShowImageLibrary(false);
            }}
          />
        </>
      )}

      {item.type === "audio" && (
        <AudioPickerField
          value={item.audioUrl}
          audioId={item.audioId}
          onChange={(url, id) =>
            onChange({
              ...item,
              value: url || "",
              audioUrl: url,
              audioId: id,
            })
          }
        />
      )}

      <div className="mt-2">
        <input
          type="text"
          placeholder="Optional label (for hints)"
          value={item.label || ""}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          className="w-full px-2 py-1 text-xs border rounded bg-background focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

interface PairEditorProps {
  pair: MatchPair;
  index: number;
  onChange: (pair: MatchPair) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function PairEditor({ pair, index, onChange, onRemove, canRemove }: PairEditorProps) {
  return (
    <div className="relative p-4 bg-background rounded-lg border-2 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Pair {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove pair"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Left Side
          </div>
          <MatchItemEditor
            item={pair.left}
            onChange={(left) => onChange({ ...pair, left })}
          />
        </div>

        <div className="relative">
          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600 rounded-full flex items-center justify-center">
              <svg
                className="w-3 h-3 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
          </div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Right Side
          </div>
          <MatchItemEditor
            item={pair.right}
            onChange={(right) => onChange({ ...pair, right })}
          />
        </div>
      </div>
    </div>
  );
}

export function MatchPairsActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<MatchPairsConfig>) {
  // Pairs are derived from config (single source of truth) so editing an
  // existing activity pre-populates and stays in sync — no duplicate local
  // state or sync effect to drift out of date.
  const pairs: MatchPair[] =
    config?.pairs?.length ? config.pairs : [createEmptyPair(), createEmptyPair()];
  const shuffleItems = config?.shuffleItems ?? true;

  const updateConfig = (updates: Partial<MatchPairsConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handlePairChange = (index: number, updatedPair: MatchPair) => {
    const newPairs = [...pairs];
    newPairs[index] = updatedPair;
    updateConfig({ pairs: newPairs });
  };

  const handleAddPair = () => {
    if (pairs.length >= 4) return;
    const newPairs = [...pairs, createEmptyPair()];
    updateConfig({ pairs: newPairs });
  };

  const handleRemovePair = (index: number) => {
    if (pairs.length <= 2) return;
    const newPairs = pairs.filter((_, i) => i !== index);
    updateConfig({ pairs: newPairs });
  };

  const getValidationErrors = () => {
    const errors: string[] = [];
    pairs.forEach((pair, i) => {
      if (!pair.left.value) {
        errors.push(`Pair ${i + 1}: Left item is empty`);
      }
      if (!pair.right.value) {
        errors.push(`Pair ${i + 1}: Right item is empty`);
      }
    });
    return errors;
  };

  const validationErrors = getValidationErrors();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Match Pairs ({pairs.length}/4)</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Students draw lines to connect matching items
          </p>
        </div>

        {pairs.length < 4 && (
          <button
            type="button"
            onClick={handleAddPair}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Pair
          </button>
        )}
      </div>

      <div className="space-y-4">
        {pairs.map((pair, index) => (
          <PairEditor
            key={index}
            pair={pair}
            index={index}
            onChange={(updatedPair) => handlePairChange(index, updatedPair)}
            onRemove={() => handleRemovePair(index)}
            canRemove={pairs.length > 2}
          />
        ))}
      </div>

      <div className="pt-4 border-t">
        <Checkbox
          checked={shuffleItems}
          onChange={(shuffle) => updateConfig({ shuffleItems: shuffle })}
          label="Shuffle right-side items (prevents memorization of positions)"
        />
      </div>

      {validationErrors.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Incomplete pairs
              </p>
              <ul className="mt-1 text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-muted/50 rounded-lg border">
        <p className="text-xs text-muted-foreground">
          <strong>Preview:</strong> {pairs.length} pair{pairs.length !== 1 ? "s" : ""}{" "}
          to match.{" "}
          {pairs.filter((p) => p.left.type === "letter" || p.right.type === "letter").length > 0 && "Letters "}
          {pairs.filter((p) => p.left.type === "word" || p.right.type === "word")
            .length > 0 && "Words "}
          {pairs.filter((p) => p.left.type === "image" || p.right.type === "image")
            .length > 0 && "Images "}
          {pairs.filter((p) => p.left.type === "audio" || p.right.type === "audio")
            .length > 0 && "Audio "}
          will be displayed on screen. Student draws lines to connect matching items.
        </p>
      </div>
    </div>
  );
}
