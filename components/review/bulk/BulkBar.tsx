"use client";

/**
 * The bulk strip above the list (CW-10): the selection with Approve all, then
 * the run's progress, then its report (what failed and why, Undo all).
 */

import * as React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { answered, runSummary } from "@/lib/review/bulk";
import { cn } from "@/lib/utils";
import { Ar, KBD_ON_BUTTON, Kbd } from "../parts";
import type { BulkApprove } from "./useBulkApprove";

export function BulkBar({ bulk, selectedCount, onApprove }: { bulk: BulkApprove; selectedCount: number; onApprove: () => void }) {
  const { run, running } = bulk;

  if (run) {
    const pct = run.total ? Math.round((answered(run) / run.total) * 100) : 100;
    return (
      <div className="grid gap-2 border-b border-primary/35 bg-primary/10 px-3 py-2 text-[12.5px]">
        <div className="flex flex-wrap items-center gap-2">
          <b className="font-semibold" role="status" aria-live="polite">
            {runSummary(run)}
          </b>
          <span className="flex-1" />
          {running ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={bulk.stop}>
              Stop
            </Button>
          ) : (
            <>
              {run.action === "approve" && run.done.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={bulk.undoAll}>
                  Undo {run.done.length === 1 ? "the approval" : `all ${run.done.length}`}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={bulk.dismiss} aria-label="Dismiss the report">
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={run.action === "approve" ? "Approving" : "Withdrawing"}
          aria-valuemin={0}
          aria-valuemax={run.total}
          aria-valuenow={answered(run)}
          className="h-1.5 overflow-hidden rounded-full bg-background"
        >
          <div
            className={cn("h-full bg-primary transition-[width] motion-reduce:transition-none", run.failed.length > 0 && "bg-warning")}
            style={{ width: `${pct}%` }}
          />
        </div>
        {run.failed.length > 0 && (
          <ul className="grid max-h-36 gap-1 overflow-auto" aria-label="Not approved">
            {run.failed.map((f) => (
              <li key={f.key} className="flex items-baseline gap-2 text-xs">
                <Ar className="text-base leading-normal">{run.titles[f.key] ?? f.title}</Ar>
                <span className="text-[hsl(0_60%_45%)] dark:text-[hsl(0_70%_70%)]">{f.reason}</span>
              </li>
            ))}
          </ul>
        )}
        {!running && run.failed.length > 0 && (
          <p className="text-xs text-muted-foreground">The ones that failed are still waiting; open one to see it on its own.</p>
        )}
        {!running && run.action === "approve" && run.done.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <Kbd>u</Kbd> undoes the last one; Undo all withdraws every approval, one at a time.
          </p>
        )}
      </div>
    );
  }

  if (selectedCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-primary/35 bg-primary/10 px-3 py-2 text-[12.5px]">
      <b className="font-semibold" aria-live="polite">
        {selectedCount} selected
      </b>
      <span className="flex-1" />
      <Button size="sm" className="h-7 bg-success px-2.5 text-xs text-success-foreground hover:bg-success/90" onClick={onApprove}>
        <Check className="me-1 h-3.5 w-3.5" aria-hidden="true" /> Approve {selectedCount === 1 ? "it" : `all ${selectedCount}`}{" "}
        <Kbd className={cn("ms-1.5", KBD_ON_BUTTON)}>shift A</Kbd>
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={bulk.clear}>
        Clear
      </Button>
    </div>
  );
}
