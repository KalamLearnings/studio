"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FormField,
  NumberInput,
  OptionSelector,
  OptionsGrid,
  NumberGrid,
} from "./shared";
import type {
  BaseActivityFormProps,
  BreakTimeMiniGameConfig,
  ShapeType,
  BreakVariant,
} from "./types";

const BREAK_TYPE_OPTIONS = [
  { value: "tracing_lines", label: "Tracing Lines", icon: "✏️" },
  { value: "dot_tapping", label: "Dot Tapping", icon: "👆" },
  { value: "coloring", label: "Coloring", icon: "🎨" },
  { value: "memory_game", label: "Memory Game", icon: "🧠" },
  { value: "tap_shapes", label: "Tap Shapes", icon: "🔷" },
];

const COLOR_OPTIONS = [
  { value: "red", label: "Red", icon: "🔴" },
  { value: "orange", label: "Orange", icon: "🟠" },
  { value: "yellow", label: "Yellow", icon: "🟡" },
  { value: "green", label: "Green", icon: "🟢" },
  { value: "blue", label: "Blue", icon: "🔵" },
  { value: "purple", label: "Purple", icon: "🟣" },
  { value: "pink", label: "Pink", icon: "🩷" },
];

const LINE_PATTERN_OPTIONS = [
  { value: "straight", label: "Straight", icon: "➖" },
  { value: "wavy", label: "Wavy", icon: "〰️" },
  { value: "zigzag", label: "Zigzag", icon: "⚡" },
  { value: "spiral", label: "Spiral", icon: "🌀" },
  { value: "star", label: "Star", icon: "⭐" },
  { value: "heart", label: "Heart", icon: "❤️" },
];

const SHAPE_OPTIONS: { value: ShapeType; label: string; icon: string }[] = [
  { value: "circle", label: "Circle", icon: "⭕" },
  { value: "square", label: "Square", icon: "⬜" },
  { value: "triangle", label: "Triangle", icon: "🔺" },
  { value: "star", label: "Star", icon: "⭐" },
  { value: "rectangle", label: "Rectangle", icon: "▬" },
  { value: "diamond", label: "Diamond", icon: "🔷" },
  { value: "oval", label: "Oval", icon: "⬭" },
  { value: "heart", label: "Heart", icon: "❤️" },
];

const CARD_COUNT_OPTIONS = [6, 8, 10, 12, 14, 16];

/**
 * Form for break_time_minigame activity.
 * Supports multiple break variants: tracing, dot tapping, coloring, memory game, tap shapes.
 */
export function BreakActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<BreakTimeMiniGameConfig>) {
  const variant = config?.variant || "tracing_lines";
  const duration = config?.duration || 30;
  const color = config?.color;
  const linePattern = config?.linePattern;
  const cardCount = config?.cardCount || 6;
  const targetShape = config?.targetShape;
  const targetCount = config?.targetCount || 5;
  const totalShapes = config?.totalShapes || 10;

  const updateConfig = (updates: Partial<BreakTimeMiniGameConfig>) => {
    onChange({ ...config, ...updates });
  };

  // Only coloring needs duration
  const needsDuration = variant === "coloring";

  return (
    <div className="space-y-4">
      <FormField label="Break Type" hint="Type of break activity" required>
        <OptionsGrid
          value={variant}
          onChange={(value) =>
            updateConfig({ variant: value as BreakVariant })
          }
          options={BREAK_TYPE_OPTIONS}
          columns={5}
          size="md"
        />
      </FormField>

      {variant === "tracing_lines" && (
        <FormField
          label="Line Pattern"
          hint="Pattern or shape to trace"
          required
        >
          <OptionsGrid
            value={linePattern || ""}
            onChange={(value) => updateConfig({ linePattern: value })}
            options={LINE_PATTERN_OPTIONS}
            columns={3}
            size="md"
          />
        </FormField>
      )}

      {variant === "dot_tapping" && (
        <FormField
          label="Target Color"
          hint="Color of dots the child should tap"
          required
        >
          <OptionsGrid
            value={color || ""}
            onChange={(value) => updateConfig({ color: value })}
            options={COLOR_OPTIONS}
            columns={4}
            size="md"
          />
        </FormField>
      )}

      {variant === "memory_game" && (
        <FormField
          label="Card Count"
          hint="Total number of cards (must be multiple of 2, 6-12)"
          required
        >
          <NumberGrid
            value={cardCount}
            onChange={(value) => updateConfig({ cardCount: value })}
            options={CARD_COUNT_OPTIONS}
            columns={4}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {cardCount} cards = {cardCount / 2} pairs to match
          </p>
        </FormField>
      )}

      {variant === "tap_shapes" && (
        <>
          <FormField
            label="Target Shape"
            hint="The shape children should tap"
            required
          >
            <OptionsGrid
              value={targetShape || ""}
              onChange={(value) =>
                updateConfig({ targetShape: value as ShapeType })
              }
              options={SHAPE_OPTIONS}
              columns={4}
              size="md"
            />
          </FormField>

          <FormField label="Target Count" hint="How many target shapes to find">
            <NumberInput
              value={targetCount}
              onChange={(value) => updateConfig({ targetCount: value })}
              min={3}
              max={10}
            />
          </FormField>

          <FormField
            label="Total Shapes on Screen"
            hint="Total shapes displayed (including distractors)"
          >
            <NumberInput
              value={totalShapes}
              onChange={(value) => updateConfig({ totalShapes: value })}
              min={targetCount + 2}
              max={20}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {totalShapes - targetCount} distractor shapes will be shown
            </p>
          </FormField>
        </>
      )}

      {needsDuration && (
        <FormField
          label="Duration (seconds)"
          hint="How long the break activity should last"
        >
          <NumberInput
            value={duration}
            onChange={(value) => updateConfig({ duration: value })}
            min={10}
          />
        </FormField>
      )}

      {/* Preview for tap_shapes */}
      {variant === "tap_shapes" && targetShape && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-primary">
            <strong>Preview:</strong> Children will tap all{" "}
            <span className="text-lg">
              {SHAPE_OPTIONS.find((s) => s.value === targetShape)?.icon}
            </span>{" "}
            <strong>
              {SHAPE_OPTIONS.find((s) => s.value === targetShape)?.label}s
            </strong>{" "}
            ({targetCount} targets among {totalShapes} total shapes)
          </p>
        </div>
      )}
    </div>
  );
}
