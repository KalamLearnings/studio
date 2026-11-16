"use client";

/**
 * Pick why something is rejected, with an optional note (`other` needs one).
 * Controlled. With `numbered`, each reason shows its number key: Review's
 * panes pick reasons with `1`-`9` while the picker is open.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Reason<V extends string = string> {
  value: V;
  label: string;
}

export function ReasonPicker<V extends string>({
  reasons,
  value,
  onChange,
  note,
  onNote,
  noteNeeded,
  error,
  numbered = false,
  label = "Reason",
  noteRef,
}: {
  reasons: readonly Reason<V>[];
  value: V | null;
  onChange: (v: V) => void;
  note: string;
  onNote: (note: string) => void;
  noteNeeded: boolean;
  error?: string | null;
  numbered?: boolean;
  label?: string;
  noteRef?: React.Ref<HTMLInputElement>;
}) {
  const id = React.useId();
  return (
    <div className="grid w-full gap-2">
      <div role="radiogroup" aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-1.5">
        {reasons.map((r, i) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={value === r.value}
            onClick={() => onChange(r.value)}
            className={cn(
              "flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === r.value && "border-destructive/70 bg-destructive/10",
            )}
          >
            {numbered && i < 9 && (
              <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-b-2 bg-background px-1 font-mono text-[10.5px] font-semibold text-muted-foreground">
                {i + 1}
              </kbd>
            )}
            {r.label}
          </button>
        ))}
      </div>
      <input
        ref={noteRef}
        aria-label={noteNeeded ? "Note (needed)" : "Note (optional)"}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        placeholder={noteNeeded ? "Note (needed)" : "Note (optional)"}
        value={note}
        maxLength={500}
        onChange={(e) => onNote(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && (
        <p id={`${id}-err`} role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
