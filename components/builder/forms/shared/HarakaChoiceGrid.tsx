"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  HARAKA_META,
  applyHaraka,
  composeHaraka,
  decomposeHaraka,
  type HarakaType,
  type HarakaBase,
} from "@kalam/curriculum-schemas";

/**
 * Haraka chooser shared by the letter picker popover and the drag-haraka
 * forms. Shadda is a modifier toggle above a grid of vowel tiles, so the
 * fourteen ids read as "vowel, doubled or not" rather than a flat list.
 * Composition rules (which combinations exist) come from `composeHaraka`.
 */

const BASES: (HarakaBase | "none")[] = [
  "fatha",
  "damma",
  "kasra",
  "sukoon",
  "fathatan",
  "dammatan",
  "kasratan",
  "none",
];

const BASE_LABELS: Record<HarakaBase | "none", string> = {
  fatha: "Fatha",
  damma: "Damma",
  kasra: "Kasra",
  sukoon: "Sukoon",
  fathatan: "Fathatan",
  dammatan: "Dammatan",
  kasratan: "Kasratan",
  none: "None",
};

export interface HarakaChoiceGridProps {
  /** Currently selected ids (one entry in single mode). */
  value: HarakaType[];
  /** Fired when a haraka tile is clicked. The caller decides select/toggle semantics. */
  onSelect: (haraka: HarakaType) => void;
  /** Show a "None" tile (single mode only). Fires `onNone`. */
  allowNone?: boolean;
  onNone?: () => void;
  noneSelected?: boolean;
  /** Ids that cannot be chosen, with an optional hover hint. */
  disabledIds?: HarakaType[];
  disabledHint?: string;
  /** Caption under a disabled tile, e.g. "target". */
  disabledCaption?: string;
  /** Caption under a selected tile, e.g. "distractor". */
  selectedCaption?: string;
  /** The letter the tiles preview on. */
  sampleLetter?: string;
  size?: "sm" | "md";
  className?: string;
}

export function HarakaChoiceGrid({
  value,
  onSelect,
  allowNone = false,
  onNone,
  noneSelected = false,
  disabledIds = [],
  disabledHint,
  disabledCaption,
  selectedCaption,
  sampleLetter = "ب",
  size = "md",
  className,
}: HarakaChoiceGridProps) {
  const [shaddaOn, setShaddaOn] = React.useState<boolean>(() =>
    value.length > 0 ? decomposeHaraka(value[0]).shadda : false,
  );

  const selectedWithShadda = value.filter((h) => decomposeHaraka(h).shadda).length;
  const selectedWithout = value.length - selectedWithShadda;
  const hiddenCount = shaddaOn ? selectedWithout : selectedWithShadda;

  const sm = size === "sm";

  return (
    <div className={cn("space-y-1.5", className)}>
      <button
        type="button"
        onClick={() => setShaddaOn((v) => !v)}
        aria-pressed={shaddaOn}
        className={cn(
          "flex w-full items-center justify-between rounded-md border px-2 transition-all",
          sm ? "py-1 text-[10px]" : "py-1.5 text-xs",
          shaddaOn
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background hover:border-primary/50",
        )}
      >
        <span className="flex items-center gap-1.5">
          <span className={cn("font-arabic leading-none", sm ? "text-base" : "text-xl")}>
            {applyHaraka(sampleLetter, "shadda")}
          </span>
          <span className="font-medium">Shadda</span>
          <span className={cn(shaddaOn ? "opacity-80" : "text-muted-foreground")}>
            {shaddaOn ? "on" : "off"}
          </span>
        </span>
        {hiddenCount > 0 && (
          <span
            className={cn(
              "rounded px-1 font-medium",
              shaddaOn ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
            )}
            title={`${hiddenCount} selected ${shaddaOn ? "without" : "with"} shadda`}
          >
            +{hiddenCount}
          </span>
        )}
      </button>

      <div className={cn("grid grid-cols-4", sm ? "gap-1" : "gap-2")}>
        {BASES.map((base) => {
          const id = composeHaraka(base, shaddaOn);
          const isNoneTile = base === "none" && !shaddaOn;
          if (isNoneTile && !allowNone) return null;

          const unavailable = id === null && !isNoneTile;
          const isDisabled = unavailable || (id !== null && disabledIds.includes(id));
          const isSelected = isNoneTile ? noneSelected : id !== null && value.includes(id);
          const glyph = isNoneTile
            ? "∅"
            : id === null
              ? applyHaraka(sampleLetter, base as HarakaBase)
              : applyHaraka(sampleLetter, id);
          const label = isNoneTile
            ? BASE_LABELS.none
            : base === "none"
              ? "Shadda only"
              : BASE_LABELS[base];
          const caption =
            id !== null && disabledIds.includes(id)
              ? disabledCaption
              : isSelected && !isNoneTile
                ? selectedCaption
                : undefined;

          return (
            <button
              key={base}
              type="button"
              disabled={isDisabled}
              title={
                unavailable
                  ? "Shadda cannot combine with sukoon"
                  : isDisabled
                    ? disabledHint
                    : id
                      ? HARAKA_META[id].arabic
                      : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                if (isNoneTile) onNone?.();
                else if (id) onSelect(id);
              }}
              className={cn(
                "flex flex-col items-center justify-center rounded-md border transition-all",
                sm ? "px-1 py-1" : "px-2 py-2.5",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                isDisabled && "cursor-not-allowed opacity-40 hover:border-border hover:bg-background",
              )}
            >
              <span className={cn("font-arabic leading-none", sm ? "text-base" : "text-3xl")}>
                {glyph}
              </span>
              <span className={cn("mt-1 leading-none", sm ? "text-[8px]" : "text-xs font-medium")}>
                {label}
              </span>
              {!sm && (
                <span className="mt-0.5 h-3 text-[10px] leading-none text-muted-foreground">
                  {caption ?? ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
