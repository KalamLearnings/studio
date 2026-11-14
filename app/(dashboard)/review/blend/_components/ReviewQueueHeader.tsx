"use client";

import * as React from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { REVIEW_FILTERS, type ReviewFilter } from "@/lib/blendWord/review";

interface ReviewQueueHeaderProps {
  filter: ReviewFilter;
  counts: Record<ReviewFilter, number>;
  onFilter: (filter: ReviewFilter) => void;
  refreshing: boolean;
  onRefresh: () => void;
  aiCheck: {
    pending: boolean;
    disabledReason: string | null;
    result: { ok: boolean; message?: string } | null;
    /** How many words the batch sends. */
    wordCount: number;
    onRun: () => void;
  };
}

export function ReviewQueueHeader({ filter, counts, onFilter, refreshing, onRefresh, aiCheck }: ReviewQueueHeaderProps) {
  const aiDisabled = aiCheck.pending || !!aiCheck.disabledReason || aiCheck.wordCount === 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Blend review</h1>
          <p className="text-muted-foreground">
            Words whose split or audio waits for a person: approve or reject splits, listen to takes, and fix their marks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} /> Reload
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={aiCheck.onRun}
            disabled={aiDisabled}
            title={aiCheck.disabledReason ?? "Ask the AI to flag wrong marks and practice words in the listed words."}
          >
            {aiCheck.pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI check ({aiCheck.wordCount} words)
          </Button>
        </div>
      </div>
      {(aiCheck.disabledReason || aiCheck.result) && (
        <p
          className={cn(
            "rounded-md border p-2 text-sm",
            aiCheck.result && !aiCheck.result.ok ? "border-destructive/40 bg-destructive/5 text-destructive" : "text-muted-foreground"
          )}
        >
          {aiCheck.result?.message ?? aiCheck.disabledReason}
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="tablist">
        {REVIEW_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => onFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              filter === f.value ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:border-primary/50"
            )}
          >
            {f.label} ({counts[f.value]})
          </button>
        ))}
      </div>
    </div>
  );
}
