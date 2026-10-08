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
  BreakColorName,
} from "./types";
import {
  BreakContentItemField,
  newBreakContentItem,
  type BreakContentItem,
} from "./BreakContentItemField";

const BREAK_TYPE_OPTIONS = [
  { value: "tracing_lines", label: "Tracing Lines", icon: "✏️" },
  { value: "dot_tapping", label: "Dot Tapping", icon: "👆" },
  { value: "coloring", label: "Coloring", icon: "🎨" },
  { value: "memory_game", label: "Memory Game", icon: "🧠" },
  { value: "tap_shapes", label: "Tap Shapes", icon: "🔷" },
  { value: "odd_one_out", label: "Odd One Out", icon: "👀" },
  { value: "attribute_tap", label: "Find by Rule", icon: "🎯" },
  { value: "match_two", label: "Which Two Match", icon: "👯" },
  { value: "pattern_completion", label: "Complete Pattern", icon: "🔁" },
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

const DEFAULT_PATTERN: BreakColorName[] = ["red", "blue", "red", "blue", "red"];

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
  const groupCount = config?.groupCount || 4;
  const blanks = React.useMemo(
    () => ({
      groupItem: newBreakContentItem(),
      oddItem: newBreakContentItem(),
      matchItem: newBreakContentItem(),
      distractors: [newBreakContentItem(), newBreakContentItem()],
    }),
    []
  );
  const groupItem = config?.groupItem ?? blanks.groupItem;
  const oddItem = config?.oddItem ?? blanks.oddItem;
  const matchItem = config?.matchItem ?? blanks.matchItem;
  const distractors = config?.distractors?.length ? config.distractors : blanks.distractors;
  const patternColors = config?.patternColors?.length
    ? config.patternColors
    : DEFAULT_PATTERN;

  const updateConfig = (updates: Partial<BreakTimeMiniGameConfig>) => {
    onChange({ ...config, ...updates });
  };

  const selectVariant = (value: string) => {
    const next = value as BreakVariant;
    const updates: Partial<BreakTimeMiniGameConfig> = { variant: next };
    if (next === "odd_one_out") {
      updates.groupItem = config?.groupItem ?? newBreakContentItem();
      updates.oddItem = config?.oddItem ?? newBreakContentItem();
      updates.groupCount = config?.groupCount || 4;
    }
    if (next === "attribute_tap") {
      if (!config?.targetShape && !config?.color) {
        updates.targetShape = "triangle";
      }
      updates.targetCount = config?.targetCount || 4;
      updates.totalShapes = config?.totalShapes || 8;
    }
    if (next === "match_two") {
      updates.matchItem = config?.matchItem ?? newBreakContentItem();
      updates.distractors = config?.distractors?.length
        ? config.distractors
        : [newBreakContentItem(), newBreakContentItem()];
    }
    if (next === "pattern_completion" && !config?.patternColors?.length) {
      updates.patternColors = DEFAULT_PATTERN;
    }
    updateConfig(updates);
  };

  // Only coloring needs duration
  const needsDuration = variant === "coloring";

  return (
    <div className="space-y-4">
      <FormField label="Break Type" hint="Type of break activity" required>
        <OptionsGrid
          value={variant}
          onChange={selectVariant}
          options={BREAK_TYPE_OPTIONS}
          columns={3}
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

      {variant === "odd_one_out" && (
        <>
          <p className="text-xs text-muted-foreground">
            Find the different one and find the one that does not belong use this screen. Each item can be a letter, a word, an image, or a sound.
          </p>
          <BreakContentItemField
            label="The group"
            item={groupItem}
            onChange={(item) => updateConfig({ groupItem: item })}
          />
          <BreakContentItemField
            label="The one that does not belong"
            item={oddItem}
            onChange={(item) => updateConfig({ oddItem: item })}
          />
          <FormField
            label="Size of the group"
            hint="How many matching items sit beside the odd one"
          >
            <NumberInput
              value={groupCount}
              onChange={(value) => updateConfig({ groupCount: value })}
              min={2}
              max={6}
            />
          </FormField>
        </>
      )}

      {variant === "attribute_tap" && (
        <>
          <FormField
            label="Target shape"
            hint="Leave unset to match on color only. Triangle is the 3-sided shape."
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
            {targetShape && (
              <button
                type="button"
                className="mt-2 text-xs text-muted-foreground underline"
                onClick={() => updateConfig({ targetShape: undefined })}
              >
                Clear shape
              </button>
            )}
          </FormField>
          <FormField
            label="Target color"
            hint="Set this with a shape for a rule like red and round"
          >
            <OptionsGrid
              value={color || ""}
              onChange={(value) => updateConfig({ color: value })}
              options={COLOR_OPTIONS}
              columns={4}
              size="md"
            />
            {color && (
              <button
                type="button"
                className="mt-2 text-xs text-muted-foreground underline"
                onClick={() => updateConfig({ color: undefined })}
              >
                Clear color
              </button>
            )}
          </FormField>
          {!targetShape && !color && (
            <p className="text-sm text-destructive">
              Pick a shape, a color, or both. A rule needs at least one.
            </p>
          )}
          <FormField label="How many to find">
            <NumberInput
              value={targetCount}
              onChange={(value) => updateConfig({ targetCount: value })}
              min={3}
              max={10}
            />
          </FormField>
          <FormField label="Total shapes on screen">
            <NumberInput
              value={totalShapes}
              onChange={(value) => updateConfig({ totalShapes: value })}
              min={Math.max(5, targetCount + 2)}
              max={20}
            />
          </FormField>
        </>
      )}

      {variant === "match_two" && (
        <>
          <p className="text-xs text-muted-foreground">
            Two copies of the match are on screen. Everything else is different. Each one can be a letter, a word, an image, or a sound.
          </p>
          <BreakContentItemField
            label="The two that match"
            item={matchItem}
            onChange={(item) => updateConfig({ matchItem: item })}
          />
          {distractors.map((distractor, index) => (
            <BreakContentItemField
              key={distractor.id}
              label={`Different item ${index + 1}`}
              item={distractor}
              onChange={(item) => {
                const next = distractors.slice();
                next[index] = item;
                updateConfig({ distractors: next });
              }}
            />
          ))}
          {distractors.length < 6 && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={() =>
                updateConfig({ distractors: [...distractors, newBreakContentItem()] })
              }
            >
              Add another different item
            </button>
          )}
        </>
      )}

      {variant === "pattern_completion" && (
        <FormField
          label="Color pattern"
          hint="The row the child sees, plus the answer that fills the blank. The last color is the answer."
          required
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {patternColors.slice(0, -1).map((entry, index) => (
                <span key={`${entry}-${index}`} className="text-2xl" title={entry}>
                  {COLOR_OPTIONS.find((option) => option.value === entry)?.icon}
                </span>
              ))}
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed text-sm text-muted-foreground">
                ?
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Answer:{" "}
              {COLOR_OPTIONS.find(
                (option) => option.value === patternColors[patternColors.length - 1]
              )?.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
                  onClick={() => {
                    if (patternColors.length >= 8) return;
                    updateConfig({
                      patternColors: [
                        ...patternColors,
                        option.value as BreakColorName,
                      ],
                    });
                  }}
                >
                  {option.icon} {option.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
                onClick={() => {
                  if (patternColors.length <= 3) return;
                  updateConfig({ patternColors: patternColors.slice(0, -1) });
                }}
              >
                Remove last
              </button>
            </div>
          </div>
        </FormField>
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
