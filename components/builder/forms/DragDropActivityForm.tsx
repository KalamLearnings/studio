"use client";

import * as React from "react";
import { FormField, TextInput, NumberInput, Select, Checkbox, WordSelector } from "./shared";
import type { BaseActivityFormProps } from "./types";

interface DragDropConfig {
  variant?: "animal_mouth" | "word_slots" | "letter_matching";
  targetAnimal?: string;
  targetWord?: string;
  draggableItems?: Array<{ id: string; letter: string; isCorrect: boolean }>;
  correctCount?: number;
  snapToTarget?: boolean;
}

const VARIANT_OPTIONS = [
  { value: "animal_mouth", label: "Animal Mouth" },
  { value: "word_slots", label: "Word Slots" },
  { value: "letter_matching", label: "Letter Matching" },
];

const ANIMAL_OPTIONS = [
  { value: "cow", label: "Cow" },
  { value: "donkey", label: "Donkey" },
  { value: "sheep", label: "Sheep" },
  { value: "bird", label: "Bird" },
];

export function DragDropActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<DragDropConfig>) {
  const variant = config?.variant || "animal_mouth";
  const targetAnimal = config?.targetAnimal || "cow";
  const targetWord = config?.targetWord || "";
  const draggableItems = config?.draggableItems || [];
  const draggableItemsStr = draggableItems.map((item) => item.letter).join(", ");
  const correctCount = config?.correctCount || 1;
  const snapToTarget = config?.snapToTarget ?? true;

  const updateConfig = (updates: Partial<DragDropConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <FormField label="Variant" hint="Type of drag and drop activity" required>
        <Select
          value={variant}
          onChange={(value) =>
            updateConfig({ variant: value as DragDropConfig["variant"] })
          }
          options={VARIANT_OPTIONS}
        />
      </FormField>

      {variant === "animal_mouth" && (
        <FormField label="Target Animal" hint="Which animal to feed" required>
          <Select
            value={targetAnimal}
            onChange={(value) => updateConfig({ targetAnimal: value })}
            options={ANIMAL_OPTIONS}
          />
        </FormField>
      )}

      {variant === "word_slots" && (
        <WordSelector
          value={targetWord}
          onChange={(word) => updateConfig({ targetWord: word })}
          label="Target Word"
          required
          placeholder="Type to search word library..."
        />
      )}

      <FormField label="Draggable Items" hint="Comma-separated letters" required>
        <TextInput
          value={draggableItemsStr}
          onChange={(value) => {
            const letters = value.split(",").map((l) => l.trim());
            const items = letters.map((letter, idx) => ({
              id: `item_${idx}`,
              letter,
              isCorrect: idx < correctCount,
            }));
            updateConfig({ draggableItems: items });
          }}
          placeholder="أ, ب, ت, ث"
          dir="rtl"
        />
      </FormField>

      <FormField label="Correct Count" hint="How many items are correct" required>
        <NumberInput
          value={correctCount}
          onChange={(value) => updateConfig({ correctCount: value })}
          min={1}
        />
      </FormField>

      <FormField label="Snap to Target" hint="Auto-snap when close">
        <Checkbox
          checked={snapToTarget}
          onChange={(checked) => updateConfig({ snapToTarget: checked })}
          label="Enable snap-to-target"
        />
      </FormField>
    </div>
  );
}
