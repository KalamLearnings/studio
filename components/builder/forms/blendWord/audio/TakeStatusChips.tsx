"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ChipTone, StatusChip } from "@/lib/blendWord/takes";

const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-200",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200",
  danger: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-200",
};

export function StatusPill({ tone, children, title }: { tone: ChipTone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", TONE_CLASSES[tone])}>
      {children}
    </span>
  );
}

/** The audio status of one form: a chip for the natural take and one for the stretched take. */
export function TakeStatusChips({ chips }: { chips: StatusChip[] }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <StatusPill key={chip.kind} tone={chip.tone} title={chip.detail ?? undefined}>
            <span className="font-medium">{chip.kindLabel}:</span> {chip.label}
          </StatusPill>
        ))}
      </div>
      {chips
        .filter((c) => c.detail)
        .map((c) => (
          <p key={c.kind} className="text-xs text-destructive">
            {c.kindLabel}: {c.detail}
          </p>
        ))}
    </div>
  );
}
