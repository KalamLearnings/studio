"use client";

/**
 * The Spelling pane's "Automatic check" card (CM-AIPRE): what each automatic
 * checker said about the word, and the harakat it would write, lined up against
 * the stored spelling. Always labelled as automatic: a person decides. "Use this"
 * only fills the Wrong harakat field; the reviewer still saves it (a note, or a
 * respelling held 5 s), so a suggestion never applies itself.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  canApplySuggestion,
  harakatDiff,
  sourceLabel,
  verdictText,
  type DiffUnit,
  type WordCheckSummary,
} from "@/lib/review/wordChecks";
import { Ar, Chip, PaneCard } from "../../parts";

function DiffLine({ units, side }: { units: DiffUnit[]; side: "stored" | "suggested" }) {
  return (
    <Ar className="rounded-lg border bg-background px-2.5 text-[22px]">
      {units.map((u, i) => (
        <span
          key={i}
          className={cn(
            u.changed &&
              (side === "stored"
                ? "bg-destructive/10 text-[hsl(0_60%_45%)] dark:text-[hsl(0_70%_70%)]"
                : "bg-success/15 text-[hsl(140_50%_32%)] dark:text-[hsl(140_45%_58%)]"),
          )}
        >
          {u.base}
          {side === "stored" ? u.stored : u.suggested}
        </span>
      ))}
    </Ar>
  );
}

export function AutomaticCheckCard({
  check,
  stored,
  canUse,
  onUse,
}: {
  check: WordCheckSummary;
  /** The stored spelling. */
  stored: string;
  /** The spelling still waits for a decision, so a suggestion can be taken into Wrong harakat. */
  canUse: boolean;
  onUse: (suggested: string, source: string) => void;
}) {
  return (
    <PaneCard
      title={
        <>
          Automatic check
          <Chip tone="note">Automatic</Chip>
        </>
      }
      aside={<span className="text-xs font-normal text-muted-foreground">a person decides</span>}
    >
      <p className="mb-2.5 text-xs text-muted-foreground">
        Suggestions from automatic checkers. They are often wrong for single words and practice items, and nothing
        changes until you decide.
      </p>
      <ul className="grid gap-3">
        {check.checks.map((c) => {
          const v = verdictText(c.verdict);
          const diff = c.suggested_text ? harakatDiff(stored, c.suggested_text) : null;
          const changed = !!diff?.some((u) => u.changed);
          return (
            <li key={`${c.source}:${c.run_id}`} className="grid gap-1.5 border-t pt-2.5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Chip tone={v.tone}>{v.label}</Chip>
                <span className="text-muted-foreground">{sourceLabel(c.source)}</span>
              </div>
              {c.suggested_text && diff && changed && (
                <div className="grid grid-cols-[74px_1fr] items-center gap-x-2.5 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Stored</span>
                  <span>
                    <DiffLine units={diff} side="stored" />
                  </span>
                  <span className="text-muted-foreground">Suggested</span>
                  <span>
                    <DiffLine units={diff} side="suggested" />
                  </span>
                </div>
              )}
              {c.suggested_text && diff && !changed && (
                <p className="text-xs text-muted-foreground">Its suggestion is the stored spelling.</p>
              )}
              {c.suggested_text && !diff && (
                <p className="text-xs text-muted-foreground">
                  Suggests <Ar className="text-base">{c.suggested_text}</Ar>, which has other letters: fix it by hand if
                  it is right.
                </p>
              )}
              {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
              {canUse && canApplySuggestion(stored, c) && (
                <div>
                  <Button variant="outline" size="sm" onClick={() => onUse(c.suggested_text!, c.source)}>
                    Use this in Wrong harakat
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </PaneCard>
  );
}
